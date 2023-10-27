import { computed, defineComponent, h } from 'vue';

import { ModelFields } from '@/vstutils/components/page';
import type {
    Field,
    FieldOptions,
    FieldPropsDefType,
    FieldXOptions,
    ReplaceAdditionalPropertyKeyParams,
    SetFieldValueOptions,
} from '@/vstutils/fields/base';
import { BaseField, FieldPropsDef, useFieldWrapperClasses } from '@/vstutils/fields/base';
import { onAppBeforeInit } from '@/vstutils/signals';
import { emptyInnerData, emptyRepresentData, mapObjectValues } from '@/vstutils/utils';

import type { ModelConstructor } from '@/vstutils/models';
import type { InnerData, RepresentData } from '@/vstutils/utils';
import type { ModelDefinition } from '../AppConfiguration';

type TInner = InnerData;
type TRepresent = RepresentData;

export const NestedObjectFieldMixin = defineComponent({
    props: FieldPropsDef as FieldPropsDefType<NestedObjectField>,
    emits: ['set-value', 'replace-key', 'add-key'],
    setup(props, { emit }) {
        const modelClass = props.field.nestedModel!;
        const value = computed(() => {
            return props.field.getValue(props.data);
        });
        const sandbox = computed<RepresentData>(() => {
            if (value.value && typeof value.value === 'object') {
                return value.value;
            } else {
                return emptyRepresentData();
            }
        });
        const wrapperClasses = useFieldWrapperClasses(props);

        function renderList() {
            const val = value.value ? modelClass.fromRepresentData(value.value).getViewFieldString() : '';
            return [h('div', val)];
        }

        function setFieldValue({
            field,
            value: newVal,
            replaceKeyWith,
            deleteKey,
            ...options
        }: SetFieldValueOptions) {
            let newValue = { ...sandbox.value };

            if (deleteKey) {
                newValue = Object.fromEntries(
                    Object.entries(newValue).filter(([k]) => k !== field),
                ) as RepresentData;
            }

            if (replaceKeyWith) {
                newValue = Object.fromEntries(
                    Object.entries(newValue).filter(([k]) => k !== field),
                ) as RepresentData;
                field = replaceKeyWith;
            }

            if (!deleteKey) {
                newValue[field] = newVal;
            }

            emit('set-value', {
                field: props.field.name,
                value: newValue,
                ...options,
            });
        }

        function renderDetail() {
            const children = [
                h(ModelFields, {
                    props: {
                        editable: props.type === 'edit' && !props.field.readOnly,
                        data: sandbox.value,
                        model: props.field.nestedModel,
                        fieldsErrors: props.error,
                        hideNotRequired:
                            props.field.hideNotRequired ?? props.field.nestedModel?.hideNotRequired,
                    },
                    on: {
                        'set-value': setFieldValue,
                        'add-key': (key: string) => emit('add-key', key),
                    },
                }),
            ];
            if (!props.hideTitle) {
                children.unshift(
                    h(props.field.getLabelComponent(), {
                        props: {
                            field: props.field,
                            error: props.error,
                            type: props.type,
                            value: props.field.name,
                            data: props.data,
                        },
                        on: {
                            'replace-key': (options: ReplaceAdditionalPropertyKeyParams) =>
                                emit('set-value', {
                                    field: options.newKey,
                                    value: sandbox.value,
                                    replaceKeyWith: options.oldKey,
                                }),
                            'add-key': (key: string) => emit('add-key', key),
                            'delete-key': (key: string) =>
                                emit('set-value', {
                                    field: key,
                                    deleteKey: true,
                                }),
                        },
                    }),
                );
            }
            return children;
        }

        return () =>
            h(
                'div',
                { staticClass: 'field-component', class: wrapperClasses },
                props.type === 'list' ? renderList() : renderDetail(),
            );
    },
});

interface NestedObjectFieldXOptions extends FieldXOptions {
    hideNotRequired?: boolean;
}

export class NestedObjectField
    extends BaseField<TInner, TRepresent, NestedObjectFieldXOptions>
    implements Field<TInner, TRepresent, NestedObjectFieldXOptions>
{
    nestedModel: ModelConstructor | null = null;
    hideNotRequired?: boolean;

    constructor(options: FieldOptions<NestedObjectFieldXOptions, TInner>) {
        super(options);
        this.hideNotRequired = this.props.hideNotRequired;
        onAppBeforeInit(() => this.resolveNestedModel());
    }
    getEmptyValue() {
        return emptyInnerData();
    }
    resolveNestedModel() {
        this.nestedModel = this.app.modelsResolver.bySchemaObject(this.options as ModelDefinition);
    }
    toRepresent(data: InnerData) {
        const value = this.getValue(data);
        if (value) {
            return this.nestedModel!.innerToRepresent(value);
        }
        return value;
    }
    toInner(data: RepresentData) {
        const value = this.getValue(data);
        if (value) {
            return this.nestedModel!.representToInner(value);
        }
        return value;
    }
    static get mixins() {
        return [NestedObjectFieldMixin];
    }
    parseFieldError(data: unknown, instanceData: InnerData) {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            return mapObjectValues(data, (item: unknown) =>
                super.parseFieldError(item, instanceData),
            ) as Record<string, unknown>;
        }
        return super.parseFieldError(data, instanceData);
    }
    override validateValue(data: RepresentData): TRepresent | null | undefined {
        const validatedValue = super.validateValue(data);
        if (this.nestedModel && validatedValue) {
            const instance = new this.nestedModel();
            instance._validateAndSetData(validatedValue);
        }
        return validatedValue;
    }

    getContainerCssClasses(data: RepresentData) {
        const value = this.getValue(data);
        const classes = [];
        for (const field of this.nestedModel!.fields.values()) {
            const fieldClasses = field.getContainerCssClasses(value ?? emptyRepresentData());
            if (fieldClasses) {
                const prefix = `field-${this.name}-`;
                for (const fieldClass of fieldClasses) {
                    classes.push(fieldClass.replace(/^field-/, prefix));
                }
            }
        }
        return classes;
    }
}
