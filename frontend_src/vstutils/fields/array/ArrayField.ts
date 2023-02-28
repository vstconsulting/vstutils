import type { ParameterCollectionFormat } from 'swagger-schema-official';

import type {
    ExtractInner,
    ExtractRepresent,
    Field,
    FieldOptions,
    FieldXOptions,
} from '@/vstutils/fields/base';
import { BaseField } from '@/vstutils/fields/base';
import { ChoicesField, OrderingChoicesField } from '@/vstutils/fields/choices';
import { FKField } from '@/vstutils/fields/fk/fk';
import { NestedObjectField } from '@/vstutils/fields/nested-object';
import { integer, NumberField } from '@/vstutils/fields/numbers';
import { StringField } from '@/vstutils/fields/text';
import { onAppBeforeInit } from '@/vstutils/signals';

import { ChoicesArrayFieldMixin } from './custom/choices';
import { FKArrayFieldMixin } from './custom/fk';
import { NestedObjectArrayFieldMixin } from './custom/nested-object';
import { IntegerArrayFieldMixin, NumberArrayFieldMixin } from './custom/number';
import { StringArrayFieldMixin } from './custom/string';
import { ArrayFieldMixin } from './mixins';
import type { InnerData, RepresentData } from '@/vstutils/utils';

export interface ArrayFieldXOptions extends FieldXOptions {
    'x-collectionFormat'?: ParameterCollectionFormat;
}

export class ArrayField<TRealField extends Field = Field> extends BaseField<
    ExtractInner<TRealField>[] | string,
    ExtractRepresent<TRealField>[],
    ArrayFieldXOptions
> {
    static SEPARATORS = new Map<ParameterCollectionFormat, string>([
        ['csv', ','],
        ['ssv', ' '],
        ['tsv', '\t'],
        ['pipes', '|'],
    ]);

    static CUSTOM_COMPONENTS = new Map<new (options: any) => Field, unknown>([
        [ChoicesField as unknown as new (options: any) => Field, ChoicesArrayFieldMixin],
        [OrderingChoicesField as unknown as new (options: any) => Field, ChoicesArrayFieldMixin],
        [FKField, FKArrayFieldMixin],
        [StringField, StringArrayFieldMixin],
        [NumberField, NumberArrayFieldMixin],
        [integer.IntegerField, IntegerArrayFieldMixin],
        [NestedObjectField, NestedObjectArrayFieldMixin],
    ]);

    collectionFormat?: ParameterCollectionFormat;
    separator?: string;
    minItems: number;
    maxItems: number;
    uniqueItems: boolean;

    itemField?: TRealField;

    constructor(options: FieldOptions<ArrayFieldXOptions, ExtractInner<TRealField>[]>) {
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
        return [ArrayFieldMixin];
    }

    getEmptyValue() {
        return [] as ExtractInner<TRealField>[];
    }

    prepareFieldForView(path: string) {
        this.itemField!.prepareFieldForView(path);
    }

    resolveItemField() {
        this.itemField = this.app.fieldsResolver.resolveField(this.options.items!, this.name) as TRealField;
        this.itemField.model = this.model;

        const customComponent = ArrayField.CUSTOM_COMPONENTS.get(
            this.itemField.constructor as new (options: any) => Field,
        );
        if (customComponent) {
            this.component.mixins = [customComponent];
        }
    }

    toInner(data: RepresentData): ExtractInner<TRealField>[] | string | null | undefined {
        const value = this.getValue(data);
        if (value) {
            if (value.length === 0) {
                return this.separator ? '' : (value as ExtractInner<TRealField>[]);
            }
            const dataCopy = Object.assign({}, data);
            const innerValues = value.map((item) => {
                dataCopy[this.name] = item;
                return this.itemField!.toInner(dataCopy) as ExtractInner<TRealField>;
            });
            return this.separator ? innerValues.map((v) => String(v)).join(this.separator) : innerValues;
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

    toRepresent(data: InnerData): ExtractRepresent<TRealField>[] | undefined | null {
        const value = this._deserializeValue(data);
        if (value) {
            const dataCopy = Object.assign({}, data);
            return value.map((item) => {
                dataCopy[this.name] = item;
                return this.itemField!.toRepresent(dataCopy) as ExtractRepresent<TRealField>;
            });
        }
        return value;
    }

    parseFieldError(errorData: unknown, instanceData: InnerData): unknown[] | null {
        if (Array.isArray(errorData)) {
            return errorData.map((error) => this.itemField!.parseFieldError(error, instanceData));
        }
        return null;
    }
}

export default ArrayField;
