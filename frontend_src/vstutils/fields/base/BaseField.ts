import type { ParameterType } from 'swagger-schema-official';
import { defineComponent, markRaw, toRaw } from 'vue';
import type { InnerData, RepresentData } from '../../utils';
import {
    _translate,
    deepEqual,
    X_OPTIONS,
    stringToCssClass,
    nameToTitle,
    capitalize,
    assertNever,
} from '../../utils';
import { pop_up_msg } from '../../popUp';
import type { ModelConstructor } from '../../models';
import BaseFieldMixin from './BaseFieldMixin.vue';
import { i18n } from '../../translation';
import type { IApp } from '#vstutils/app';
import type { Component } from 'vue';
import { BaseFieldLabel } from '#vstutils/fields/base';
import type {
    DefaultXOptions,
    Field,
    FieldMixin,
    FieldOptions,
    ModelPropertyDescriptor,
    RedirectOptions,
} from './Field';

export * from './Field';

const componentsCache = new WeakMap<FieldConstructor, Component>();

export class BaseField<Inner, Represent, XOptions extends DefaultXOptions = DefaultXOptions>
    implements Field<Inner, Represent, XOptions>
{
    static fkLinkable = true;

    options: FieldOptions<XOptions, Inner>;
    props: XOptions;
    component?: Component;

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
    model?: ModelConstructor;

    translateFieldName: string;
    disableLabelTranslation: boolean;

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
        this.disableLabelTranslation = this.props?.disableLabelTranslation ?? false;
    }

    static get app(): IApp {
        return globalThis.__currentApp!;
    }

    get app(): IApp {
        return globalThis.__currentApp!;
    }

    get fkLinkable(): boolean {
        return (this.constructor as typeof BaseField).fkLinkable;
    }

    getComponent(): Component {
        return this.component ?? (this.constructor as FieldConstructor)._component;
    }

    getArrayComponent(): Component | undefined {
        return undefined;
    }

    getLabelComponent(): Component {
        return BaseFieldLabel;
    }

    translateValue(value: Represent) {
        return value;
    }

    getValue(data?: InnerData): Inner | null | undefined;
    getValue(data?: RepresentData): Represent | null | undefined;
    getValue(data?: InnerData | RepresentData): Inner | Represent | null | undefined {
        if (!data) {
            return undefined;
        }
        return this._getValueFromData(data);
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
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    prepareFieldForView(path: string): void {}

    /**
     * Returns field default value if any, or empty value otherwise
     */
    getInitialValue({ requireValue = false } = {}): Inner | undefined | null {
        const customInitialValue = this.getCustomInitialValue();
        if (customInitialValue) {
            return customInitialValue;
        }
        if (this.required || requireValue) {
            return this.hasDefault ? this.default : this.getEmptyValue();
        }
        return undefined;
    }

    protected getCustomInitialValue(): Inner | undefined | null {
        const initialValueConfig = this.props?.initialValue;
        if (!initialValueConfig) {
            return;
        }

        if (initialValueConfig.type === 'from_first_parent_detail_view_that_has_field') {
            for (const item of this.app.store.viewItems.slice(0, -1).toReversed()) {
                if (item.view.isDetailPage()) {
                    const state = item.view.getSavedState();
                    if (state?.instance && state.instance._fields.has(initialValueConfig.field_name)) {
                        return state.instance.getInnerValue(initialValueConfig.field_name) as any;
                    }
                }
            }
            return;
        }

        assertNever(initialValueConfig.type);
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
    toInner(data: RepresentData): Inner | null | undefined {
        return this.getValue(data as unknown as InnerData);
    }

    /**
     * Method, that converts field value from API to display form
     */
    toRepresent(data: InnerData): Represent | null | undefined {
        return this.getValue(data as unknown as RepresentData);
    }

    /**
     * Method that validates value.
     */
    validateValue(data: RepresentData): Represent | null | undefined {
        let value = this.getValue(data);
        const samples = pop_up_msg.field.error;
        const $t = _translate;

        if (this.type === 'string' && this.required && value === undefined) {
            value = '' as Represent;
        }

        if (typeof value === 'string') {
            const value_length = value.toString().length;

            if (this.options.maxLength && value_length > this.options.maxLength) {
                throw {
                    error: 'validation',
                    message: $t(samples.maxLength).format([this.options.maxLength]),
                };
            }

            if (this.options.minLength) {
                if (value_length === 0) {
                    if (!this.required) {
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

        if (
            (value === undefined && this.required && !this.options.default) ||
            (value === null && !this.nullable)
        ) {
            throw {
                error: 'validation',
                message: $t(samples.empty),
            };
        }

        return value;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    validateInner(data: InnerData): Inner | null | undefined {
        return this.getValue(data);
    }

    /**
     * Static property for storing field mixins.
     */
    static get mixins(): FieldMixin[] {
        return [BaseFieldMixin];
    }

    protected static __component: Component | undefined;

    protected static get _component() {
        if (!componentsCache.has(this)) {
            componentsCache.set(
                this,
                markRaw(
                    defineComponent({
                        // @ts-expect-error ts does not understand constructor name
                        name: this.name,
                        mixins: this.mixins,
                    }),
                ),
            );
        }
        return componentsCache.get(this)!;
    }
    /**
     * Method that creates property descriptor from current field
     */
    toDescriptor(): ModelPropertyDescriptor<Represent> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const fieldThis = this;

        return {
            get() {
                return toRaw(this).sandbox.value[fieldThis.name] as Represent | null | undefined;
            },
            set(value: Represent) {
                this.sandbox.set({
                    field: fieldThis.name,
                    value: fieldThis.validateValue({ ...this.sandbox.value, [fieldThis.name]: value }),
                });
            },
        };
    }
    isEqual(this: Field<any, any, any>, other: Field<any, any, any>) {
        if (this === other) return true;
        if (!other) return false;
        if (other.constructor !== this.constructor) return false;
        return deepEqual(this.options, other.options);
    }
    isSameValues(data1: RepresentData, data2: RepresentData) {
        return deepEqual(this.toInner(data1), this.toInner(data2));
    }
    parseFieldError(errorData: unknown, instanceData: InnerData): unknown | null {
        if (!errorData) {
            return '';
        }
        if (typeof errorData === 'string') {
            return i18n.ts(errorData);
        }
        if (Array.isArray(errorData)) {
            return errorData
                .map((item) => this.parseFieldError(item, instanceData))
                .filter((item) => Boolean(item))
                .join(' ');
        }
        return errorData as Record<string, unknown>;
    }

    protected formatContainerCssClass(value: string | null | undefined) {
        if (value === undefined) {
            return `field-${this.name}`;
        }
        return `field-${this.name}-${stringToCssClass(value)}`;
    }

    getContainerCssClasses(_data: RepresentData): string[] | undefined {
        return undefined;
    }
}

export type FieldConstructor = typeof BaseField;

export default BaseField;
