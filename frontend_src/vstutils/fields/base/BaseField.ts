import type { Schema, ParameterType, ParameterCollectionFormat } from 'swagger-schema-official';
import { _translate, capitalize, deepEqual, nameToTitle, X_OPTIONS } from '../../utils';
import { pop_up_msg } from '../../popUp';
import type { Model } from '../../models';
import type { QuerySet } from '../../querySet';
import BaseFieldMixin from './BaseFieldMixin.vue';
import { i18n } from '../../translation';
import { IApp } from '@/vstutils/app';
import { ComponentOptions } from 'vue';

type ModelPropertyDescriptor<Represent> = PropertyDescriptor & {
    get(this: Model): Represent | null | undefined;
    set(this: Model, value: Represent | null | undefined): void;
};

type FieldsData = Record<string, unknown>;

interface RedirectOptions {
    operation_name?: string;
    depend_field?: string;
    concat_field_name?: boolean;
}

export interface FieldXOptions {
    prependText?: string;
    appendText?: string;
    redirect?: RedirectOptions;
    translateFieldName?: string;
    [key: string]: unknown;
}

export type FieldOptions<XOptions extends FieldXOptions | undefined, Inner> = Omit<
    Schema,
    'default' | 'items'
> & {
    allowEmptyValue?: boolean;
    collectionFormat?: ParameterCollectionFormat;
    default?: Inner;
    hidden?: boolean;
    items?: FieldOptions<FieldXOptions | undefined, unknown>;
    name: string;
    required?: boolean;
    title?: string;
    'x-collectionFormat'?: ParameterCollectionFormat;
    'x-format'?: string;
    'x-hidden'?: boolean;
    'x-nullable'?: boolean;
} & (XOptions extends undefined ? { 'x-options'?: XOptions } : { 'x-options': XOptions });

export interface Field<
    Inner = unknown,
    Represent = unknown,
    XOptions extends FieldXOptions | undefined = FieldXOptions | undefined,
> {
    options: FieldOptions<XOptions, Inner>;
    props: XOptions;

    type: ParameterType;
    format?: string;

    name: string;
    title: string;
    required: boolean;
    readOnly: boolean;
    nullable: boolean;
    description?: string;
    hidden: boolean;

    hasDefault: boolean;
    default?: Inner;

    prependText?: string;
    appendText?: string;

    redirect?: RedirectOptions;

    model?: typeof Model;

    translateFieldName: string;

    getComponent(): ComponentOptions<Vue>;

    toInner(data: Record<string, unknown>): Inner | null | undefined;
    toRepresent(data: Record<string, unknown>): Represent | null | undefined;
    validateValue(data: Record<string, unknown>): void;

    prepareFieldForView(path: string): void;
    afterInstancesFetched(instances: Model[], queryset: QuerySet): Promise<void>;

    getInitialValue(args?: { requireValue: boolean }): Inner | undefined | null;
    getEmptyValue(): Inner | undefined | null;

    toDescriptor(): ModelPropertyDescriptor<Represent>;

    isEqual(other: Field<any, any, any>): boolean;

    isSameValues(data1: FieldsData, data2: FieldsData): boolean;

    parseFieldError(errorData: unknown, instanceData: FieldsData): unknown;
}

export class BaseField<
    Inner,
    Represent,
    XOptions extends FieldXOptions | undefined = FieldXOptions | undefined,
> implements Field<Inner, Represent, XOptions>
{
    static fkLinkable = true;

    options: FieldOptions<XOptions, Inner>;
    props: XOptions;
    component: ComponentOptions<Vue>;

    type: ParameterType;
    format?: string;

    name: string;
    title: string;
    required: boolean;
    readOnly: boolean;
    nullable: boolean;
    description?: string;
    hidden: boolean;

    hasDefault: boolean;
    default?: Inner;

    prependText?: string;
    appendText?: string;

    redirect?: RedirectOptions;

    validators: ((value: Represent) => void)[];
    model?: typeof Model;

    translateFieldName: string;

    constructor(options: FieldOptions<XOptions, Inner>) {
        this.options = options;

        this.props = (options[X_OPTIONS] as unknown as XOptions) || ({} as XOptions);
        this.type = options.type ?? 'string';
        this.format = options.format;
        this.validators = [];
        this.hidden = options['x-hidden'] ?? options.hidden ?? false;
        this.name = options.name;
        this.title = options.title ?? capitalize(nameToTitle(this.name));
        this.description = options.description;
        this.required = Boolean(options.required);
        this.readOnly = Boolean(options.readOnly);
        this.nullable = Boolean(options['x-nullable']);

        this.hasDefault = Object.prototype.hasOwnProperty.call(options, 'default');
        if (this.hasDefault) {
            this.default = options.default;
        }

        this.prependText = this.props?.prependText;
        this.appendText = this.props?.appendText;

        this.redirect = this.props?.redirect;

        this.translateFieldName = this.props?.translateFieldName ?? this.name;

        this.component = {
            name: `${this.constructor.name || capitalize(this.name)}Component`,
            mixins: (this.constructor as typeof BaseField).mixins,
        };
    }

    static get app(): IApp {
        return globalThis.__currentApp;
    }

    get app(): IApp {
        return globalThis.__currentApp;
    }

    getComponent(): ComponentOptions<Vue> {
        return this.component;
    }

    translateValue(value: Represent) {
        return value;
    }

    _getValueFromData(data: Record<string, unknown>): Inner | Represent | undefined | null {
        return data[this.name] as Inner | Represent | undefined | null;
    }

    warn(msg: string): void {
        console.warn(`${this.constructor.name} ${this.model?.name ?? ''}.${this.name}: ${msg}`);
    }

    error(msg: string): never {
        throw new Error(`${this.constructor.name} ${this.model?.name ?? ''}.${this.name}: ${msg}`);
    }

    /**
     * Method, that prepares instance of field for usage. Method is called after models and views are
     * created, for every field instance that is part of view.
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    prepareFieldForView(path: string): void {}

    /**
     * Method that will be called after every fetch of instances from api (QuerySet#items, QuerySet#get)
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    async afterInstancesFetched(instances: Model[], queryset: QuerySet) {}

    /**
     * Returns field default value if any, or empty value otherwise
     */
    getInitialValue({ requireValue = false } = {}): Inner | undefined | null {
        if (this.required || requireValue) {
            return this.hasDefault ? this.default : this.getEmptyValue();
        }
        return undefined;
    }

    /**
     * Returns empty value of field
     */
    getEmptyValue(): Inner | null | undefined {
        return undefined;
    }

    /**
     * Method, that converts field value to appropriate for API form.
     */
    toInner(data: FieldsData): Inner | null | undefined {
        return this._getValueFromData(data) as Inner;
    }

    /**
     * Method, that converts field value from API to display form
     */
    toRepresent(data: FieldsData): Represent | null | undefined {
        return this._getValueFromData(data) as Represent;
    }

    /**
     * Method that validates value.
     * @param {RepresentData} data - Object with all values.
     */
    // eslint-disable-next-line no-unused-vars
    validateValue(data: FieldsData) {
        const value = this._getValueFromData(data);
        let value_length = 0;
        const samples = pop_up_msg.field.error;
        const $t = _translate;

        if (value) {
            value_length = value.toString().length;
        }

        if (this.options.maxLength && value_length > this.options.maxLength) {
            throw {
                error: 'validation',
                message: $t(samples.maxLength).format([this.options.maxLength]),
            };
        }

        if (this.options.minLength) {
            if (value_length === 0) {
                if (!this.options.required) {
                    return;
                }

                throw {
                    error: 'validation',
                    message: $t(samples.empty),
                };
            }

            if (value_length < this.options.minLength) {
                throw {
                    error: 'validation',
                    message: $t(samples.minLength).format([this.options.minLength]),
                };
            }
        }

        if (typeof value === 'number') {
            if (this.options.maximum && value > this.options.maximum) {
                throw {
                    error: 'validation',
                    message: $t(samples.max).format([this.options.maximum]),
                };
            }

            if (this.options.minimum && value < this.options.minimum) {
                throw {
                    error: 'validation',
                    message: $t(samples.min).format([this.options.maximum]),
                };
            }
        }

        if (value === undefined && this.options.required && this.options.default !== undefined) {
            return this.options.default;
        }

        if (value === undefined && this.options.required && !this.options.default) {
            throw {
                error: 'validation',
                message: $t(samples.required),
            };
        }

        return value;
    }
    /**
     * Static property for storing field mixins.
     */
    static get mixins(): ComponentOptions<Vue>[] {
        return [BaseFieldMixin as ComponentOptions<Vue>];
    }

    /**
     * Method that creates property descriptor from current field
     */
    toDescriptor(): ModelPropertyDescriptor<Represent> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const fieldThis = this;

        return {
            get() {
                return fieldThis.toRepresent(this._data);
            },
            set(value: Represent) {
                fieldThis.validateValue(this._data);
                this._data[fieldThis.name] = fieldThis.toInner({ ...this._data, [fieldThis.name]: value });
            },
        };
    }
    isEqual(this: Field<any, any, any>, other: Field<any, any, any>) {
        if (this === other) return true;
        if (!other) return false;
        if (other.constructor !== this.constructor) return false;
        return deepEqual(this.options, other.options);
    }
    isSameValues(data1: FieldsData, data2: FieldsData) {
        return deepEqual(this.toInner(data1), this.toInner(data2));
    }
    parseFieldError(errorData: unknown, instanceData: FieldsData): unknown | null {
        if (!errorData) {
            return '';
        }
        if (typeof errorData === 'string') {
            return i18n.t(errorData) as string;
        }
        if (Array.isArray(errorData)) {
            return errorData
                .map((item) => this.parseFieldError(item, instanceData))
                .filter((item) => Boolean(item))
                .join(' ');
        }
        return errorData as Record<string, unknown>;
    }
}

export default BaseField;
