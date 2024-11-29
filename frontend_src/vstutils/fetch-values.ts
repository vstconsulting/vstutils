import { i18n } from '#vstutils/translation';
import { AggregatedQueriesExecutor } from '#vstutils/AggregatedQueriesExecutor';
import { OBJECT_NOT_FOUND_TEXT, RequestTypes, createPropertyProxy, getApp } from '#vstutils/utils';
import { ArrayField } from '#vstutils/fields/array/ArrayField';
import { DynamicField } from '#vstutils/fields/dynamic';

import type { BaseView } from '#vstutils/views';
import type { Model, ModelConstructor } from '#vstutils/models';
import type { Field } from '#vstutils/fields/base';
import type { QuerySet } from '#vstutils/querySet';
import type { InnerData } from '#vstutils/utils';
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
    const modelClass = instances[0].constructor as ModelConstructor;
    const fields = Array.from(modelClass.fields.values());
    return fetchInstancesFields(instances, fields, options);
}

export function fetchPKs(
    pks: (string | number | undefined | null | Model)[],
    field: IFetchableField,
    qs?: QuerySet,
): Promise<(Model | string | number | undefined | null)[]> {
    if (!qs) {
        qs = field.getValueFetchQs((getApp().router.currentRoute.meta!.view as BaseView).path);
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
                    [field.viewField]: i18n.t(OBJECT_NOT_FOUND_TEXT),
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
            promises.push(fetchArrayFieldValues(field as ArrayField, instances, options));
        } else if (field instanceof DynamicField) {
            promises.push(fetchDynamicFieldValues(field, instances, options));
        } else if (field instanceof RelatedListField) {
            promises.push(fetchRelatedListFieldValues(field, instances, options));
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
        const value = fetchedInstances[i];
        instances[i].sandbox.setPrefetchedValue(field.name, value);
    }
}

async function fetchArrayFieldValues(
    field: ArrayField,
    instances: Model[],
    options?: Options,
): Promise<void> {
    const itemInstancesMap = new Map<Model, Model[]>();
    for (const instance of instances) {
        const items = field._deserializeValue(instance._data);
        const constructor = instance.constructor as ModelConstructor;
        // Create new instance for each item and replace array value with value of one item
        class ModelCopy extends constructor {}
        ModelCopy.fields = new Map(ModelCopy.fields);
        ModelCopy.fields.set(field.name, field.itemField!);
        const itemInstances = items.map(
            (item) => new ModelCopy(createPropertyProxy(instance._data, field.name, item)),
        );
        itemInstancesMap.set(instance, itemInstances);
    }

    const allItemInstances = Array.from(itemInstancesMap.values()).flat();

    const itemField = field.itemField!;

    await fetchInstancesFields(allItemInstances, [itemField], options);

    // Put processed items back into original instances
    for (const [instance, itemInstances] of itemInstancesMap) {
        instance.sandbox.setPrefetchedValue(
            field.name,
            itemInstances.map((itemInstance) => field.getValue(itemInstance.sandbox.value)),
        );
    }
}

async function fetchDynamicFieldValues(
    field: DynamicField,
    instances: Model[],
    options?: Options,
): Promise<void> {
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
        fetchInstancesFields(instances, [field], options),
    );

    return Promise.all(promises) as unknown as Promise<void>;
}

async function fetchRelatedListFieldValues(
    field: RelatedListField,
    instances: Model[],
    options?: Options,
): Promise<void> {
    const model = field.itemsModel!;

    const instancesValues = instances.map((instance) => {
        const value = field.getValue(instance._data) ?? [];
        return value.map((item) => new model(item));
    });
    const allInstancesValues = instancesValues.flat();
    await fetchInstances(allInstancesValues as unknown as Model[], options);

    for (let idx = 0; idx < instances.length; idx++) {
        const instance = instances[idx];
        const values = instancesValues[idx];

        instance.sandbox.setPrefetchedValue(field.name, values);
    }
}
