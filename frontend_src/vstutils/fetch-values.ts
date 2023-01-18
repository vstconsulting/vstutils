import { i18n } from '@/vstutils/translation';
import { AggregatedQueriesExecutor } from '@/vstutils/AggregatedQueriesExecutor';
import { RequestTypes, createPropertyProxy, getApp } from '@/vstutils/utils';
import { ArrayField } from '@/vstutils/fields/array';
import { DynamicField } from '@/vstutils/fields/dynamic';
import { FKField } from '@/vstutils/fields/fk/fk';

import type { View } from '@/vstutils/views';
import type { Model } from '@/vstutils/models';
import type { Field } from '@/vstutils/fields/base';
import type { QuerySet } from '@/vstutils/querySet';
import type { InnerData } from '@/vstutils/utils';
import { RelatedListField } from './fields/related-list';

export interface IFetchableField extends Field<string | number> {
    _canBeFetched: true;

    usePrefetch: boolean;

    /* Name of query param used for filtering */
    filterName: string;
    /* Name of field from which filter value will be taken */
    filterFieldName: string;

    valueField: string;
    viewField: string;

    getValueFetchQs: (path: string) => QuerySet | undefined;
}

interface Options {
    isPrefetch?: boolean;
}

export interface IArrayField extends Field<unknown[]> {
    itemField: Field;
}

export function fetchInstances(instances: Model[], options: Options = {}): Promise<void> {
    if (instances.length === 0) {
        return Promise.resolve();
    }
    const modelClass = instances[0].constructor as typeof Model;
    const fields = Array.from(modelClass.fields.values());
    return fetchInstancesFields(instances, fields, options);
}

export function fetchPKs(
    pks: (string | number | undefined | null | Model)[],
    field: IFetchableField,
    qs?: QuerySet,
): Promise<(Model | string | number | undefined | null)[]> {
    if (!qs) {
        qs = field.getValueFetchQs((getApp().router.currentRoute.meta!.view as View).path);
    }
    if (!qs) {
        return Promise.resolve(pks);
    }
    const executor = new AggregatedQueriesExecutor(
        qs.clone({ prefetchEnabled: false }),
        field.filterName,
        field.filterFieldName,
    );
    const promises = pks.map((pk) => {
        if (typeof pk === 'number' || typeof pk === 'string') {
            return executor.query(pk).catch(() => {
                const model = qs!.getResponseModelClass(RequestTypes.LIST);
                const notFound = new model({
                    [field.valueField]: pk,
                    [field.viewField]: i18n.t(FKField.NOT_FOUND_TEXT),
                } as InnerData);
                notFound.__notFound = true;
                return notFound;
            }) as Promise<Model>;
        }
        return Promise.resolve(pk);
    });
    void executor.execute();
    return Promise.all(promises);
}

function fetchInstancesFields(instances: Model[], fields: Field[], options?: Options): Promise<void> {
    const promises = [];
    for (const field of fields) {
        if (isFetchableField(field) && (field.usePrefetch || !options?.isPrefetch)) {
            promises.push(fetchFieldValues(field, instances));
        } else if (field instanceof ArrayField) {
            promises.push(fetchArrayFieldValues(field as ArrayField, instances));
        } else if (field instanceof DynamicField) {
            promises.push(fetchDynamicFieldValues(field, instances));
        } else if (field instanceof RelatedListField) {
            promises.push(fetchRelatedListFieldValues(field, instances));
        }
    }
    return Promise.all(promises) as unknown as Promise<void>;
}

function isFetchableField(field: Field): field is IFetchableField {
    return ('_canBeFetched' satisfies keyof IFetchableField) in field;
}

async function fetchFieldValues(field: IFetchableField, instances: Model[]) {
    const pks = instances.map((instance) => field.getValue(instance._data));
    const fetchedInstances = await fetchPKs(pks, field);

    for (let i = 0; i < fetchedInstances.length; i++) {
        instances[i]._setFieldValue(field.name, fetchedInstances[i], true);
    }
}

async function fetchArrayFieldValues(field: ArrayField, instances: Model[]): Promise<void> {
    const itemInstancesMap = new Map<Model, Model[]>();
    for (const instance of instances) {
        const items = field._deserializeValue(instance._data);
        // Create new instance for each item and replace array value with value of one item
        const itemInstances = items.map((item) =>
            instance.clone({ data: createPropertyProxy(instance._data, field.name, item) }),
        );
        itemInstancesMap.set(instance, itemInstances);
    }

    const allItemInstances = Array.from(itemInstancesMap.values()).flat();

    const itemField = field.itemField!;

    await fetchInstancesFields(allItemInstances, [itemField]);

    // Put processed items back into original instances
    for (const [instance, itemInstances] of itemInstancesMap) {
        instance._setFieldValue(
            field.name,
            itemInstances.map((itemInstance) => field.getValue(itemInstance._data)),
            true,
        );
    }
}

async function fetchDynamicFieldValues(field: DynamicField, instances: Model[]): Promise<void> {
    const fields = new Map<Field, Model[]>();

    for (const instance of instances) {
        const realField = field.getRealField(instance._data);
        const sameField = Array.from(fields.keys()).find((field) => realField.isEqual(field));

        if (sameField) {
            fields.get(sameField)!.push(instance);
        } else {
            fields.set(realField, [instance]);
        }
    }

    const promises = Array.from(fields.entries()).map(([field, instances]) =>
        fetchInstancesFields(instances, [field]),
    );

    return Promise.all(promises) as unknown as Promise<void>;
}

async function fetchRelatedListFieldValues(field: RelatedListField, instances: Model[]): Promise<void> {
    const model = field.itemsModel!;

    for (const instance of instances) {
        const value = field.getValue(instance._data) ?? [];
        instance._setFieldValue(
            field.name,
            value.map((item) => new model(item)),
            true,
        );
    }
    const allInstancesValues = instances.flatMap((instance) => field.getValue(instance._data));

    return fetchInstances(allInstancesValues as unknown as Model[]);
}
