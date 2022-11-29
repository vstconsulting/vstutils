import { ParameterCollectionFormat } from 'swagger-schema-official';
import { ComponentOptions } from 'vue';

import { BaseField, Field, FieldOptions, FieldXOptions } from '@/vstutils/fields/base';
import { ChoicesField } from '@/vstutils/fields/choices';
import { FKField } from '@/vstutils/fields/fk/fk';
import { integer, NumberField } from '@/vstutils/fields/numbers';
import { StringField } from '@/vstutils/fields/text';
import { onAppBeforeInit } from '@/vstutils/signals';
import { createPropertyProxy } from '@/vstutils/utils';

import { ChoicesArrayFieldMixin } from './custom/choices';
import { FKArrayFieldMixin } from './custom/fk';
import { IntegerArrayFieldMixin, NumberArrayFieldMixin } from './custom/number';
import { StringArrayFieldMixin } from './custom/string';
import { ArrayFieldMixin } from './mixins';

import type { QuerySet } from '@/vstutils/querySet';
import type { Model } from '@/vstutils/models';

export interface ArrayFieldXOptions extends FieldXOptions {
    'x-collectionFormat'?: ParameterCollectionFormat;
}

type TInner = string | unknown[];
type TRepresent = unknown[];

export class ArrayField extends BaseField<TInner, TRepresent, ArrayFieldXOptions> {
    static SEPARATORS = new Map<ParameterCollectionFormat, string>([
        ['csv', ','],
        ['ssv', ' '],
        ['tsv', '\t'],
        ['pipes', '|'],
    ]);

    static CUSTOM_COMPONENTS = new Map<new (options: any) => Field, unknown>([
        [ChoicesField as unknown as new (options: any) => Field, ChoicesArrayFieldMixin],
        [FKField, FKArrayFieldMixin],
        [StringField, StringArrayFieldMixin],
        [NumberField, NumberArrayFieldMixin],
        [integer.IntegerField, IntegerArrayFieldMixin],
    ]);

    collectionFormat?: ParameterCollectionFormat;
    separator?: string;
    minItems: number;
    maxItems: number;
    uniqueItems: boolean;

    itemField?: Field;

    constructor(options: FieldOptions<ArrayFieldXOptions, TInner>) {
        super(options);
        this.collectionFormat = options.collectionFormat || options['x-collectionFormat'];
        this.separator = this.collectionFormat ? ArrayField.SEPARATORS.get(this.collectionFormat) : undefined;
        this.minItems = options.minItems ?? 0;
        this.maxItems = options.maxItems ?? Number.POSITIVE_INFINITY;
        this.uniqueItems = options.uniqueItems ?? false;

        if (!options.items) {
            this.error('"items" attribute is required for array field');
        }

        onAppBeforeInit(() => this.resolveItemField());
    }

    static get mixins() {
        return [ArrayFieldMixin as ComponentOptions<Vue>];
    }

    getEmptyValue() {
        return [];
    }

    prepareFieldForView(path: string) {
        this.itemField!.prepareFieldForView(path);
    }

    resolveItemField() {
        this.itemField = this.app.fieldsResolver.resolveField(this.options.items!, this.name);
        this.itemField.model = this.model;

        const customComponent = ArrayField.CUSTOM_COMPONENTS.get(
            this.itemField.constructor as new (options: any) => Field,
        );
        if (customComponent) {
            this.component.mixins = [customComponent];
        }
    }

    toInner(data: Record<string, unknown>): TInner | null | undefined {
        let value = super.toInner(data) as TRepresent | null | undefined;
        if (value) {
            if (value.length === 0) {
                return this.separator ? '' : value;
            }
            const dataCopy = Object.assign({}, data);
            value = value.map((item) => {
                dataCopy[this.name] = item;
                return String(this.itemField!.toInner(dataCopy));
            });
            return this.separator ? value.join(this.separator) : value;
        }
        return value;
    }

    _deserializeValue(data: Record<string, unknown>): unknown[] {
        const value = this._getValueFromData(data);
        if (!value) {
            return [];
        }
        // If string array format is used and value was not fetched from api
        if (this.separator && !Array.isArray(value)) {
            return value.split(this.separator);
        }
        return value as unknown[];
    }

    toRepresent(data: Record<string, unknown>) {
        const value = this._deserializeValue(data);
        if (value) {
            const dataCopy = Object.assign({}, data);
            return value.map((item) => {
                dataCopy[this.name] = item;
                return this.itemField!.toRepresent(dataCopy);
            });
        }
        return value;
    }

    /**
     * Calls afterInstancesFetched hook of item field for all items in all provided instances.
     * @param {Model[]} instances - Instances of Model class which have this field
     * @param {QuerySet} queryset - Queryset used to request instances
     * @return {Promise<void>}
     */
    async afterInstancesFetched(instances: Model[], queryset: QuerySet) {
        // Keys are original instances
        // Values are array of instances for each item in original instance's value
        const itemInstancesMap = new Map<Model, Model[]>();
        for (const instance of instances) {
            const items = this._deserializeValue(instance._data);
            // Create new instance for each item and replace array value with value of one item
            const itemInstances = items.map(
                (item) =>
                    // @ts-expect-error Model.js has no types
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    new instance.constructor(
                        createPropertyProxy(instance._data, this.name, item),
                        instance._queryset,
                        instance._parentInstance,
                    ) as Model,
            );
            itemInstancesMap.set(instance, itemInstances);
        }

        const allItemInstances = Array.from(itemInstancesMap.values()).flat();
        await this.itemField!.afterInstancesFetched(allItemInstances, queryset);

        // Put processed items back into original instances
        for (const [instance, itemInstances] of itemInstancesMap) {
            instance._setFieldValue(
                this.name,
                itemInstances.map((itemInstance) => this._getValueFromData(itemInstance._data)),
                true,
            );
        }
    }
}

export default ArrayField;
