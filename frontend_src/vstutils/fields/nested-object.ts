import type { ComponentOptions } from 'vue';
import { computed, defineComponent, h } from 'vue';

import { ModelFields } from '@/vstutils/components/page';
import type {
    Field,
    FieldOptions,
    FieldPropsDefType,
    FieldXOptions,
    SetFieldValueOptions,
} from '@/vstutils/fields/base';
import { BaseField, FieldPropsDef, useFieldWrapperClasses } from '@/vstutils/fields/base';
import { onAppBeforeInit } from '@/vstutils/signals';
import { mapObjectValues } from '@/vstutils/utils';

import type { Model } from '@/vstutils/models';

type TInner = Record<string, unknown>;
type TRepresent = Record<string, unknown>;

export const NestedObjectFieldMixin = defineComponent({
    props: FieldPropsDef as FieldPropsDefType<NestedObjectField>,
    emits: ['set-value'],
    setup(props, { emit }) {
        const modelClass = props.field.nestedModel!;
        const value = computed(() => {
            return props.field._getValueFromData(props.data) as TRepresent | null | undefined;
        });
        const sandbox = computed(() => {
            if (value.value && typeof value.value === 'object') {
                return value;
            } else {
                return {};
            }
        });
        const wrapperClasses = useFieldWrapperClasses(props);

        function renderList() {
            return h('div', [value.value ? new modelClass(value.value).getViewFieldString() : '']);
        }

        function setFieldValue({ field, value: newVal, ...options }: SetFieldValueOptions) {
            emit('set-value', {
                field: props.field.name,
                value: { ...value.value, [field]: newVal },
                ...options,
            });
        }

        function renderDetail() {
            return h(ModelFields, {
                props: {
                    editable: props.type === 'edit' && !props.field.readOnly,
                    data: sandbox,
                    model: props.field.nestedModel,
                    fieldsErrors: props.error,
                    hideNotRequired: props.field.hideNotRequired,
                },
                on: { 'set-value': setFieldValue },
            });
        }

        return () =>
            h('div', { staticClass: 'field-component', class: wrapperClasses }, [
                props.type === 'list' ? renderList() : renderDetail(),
            ]);
    },
});

interface NestedObjectFieldXOptions extends FieldXOptions {
    hideNotRequired?: boolean;
}

export class NestedObjectField
    extends BaseField<TInner, TRepresent, NestedObjectFieldXOptions>
    implements Field<TInner, TRepresent, NestedObjectFieldXOptions>
{
    nestedModel: typeof Model | null = null;
    hideNotRequired?: boolean;

    constructor(options: FieldOptions<NestedObjectFieldXOptions, TInner>) {
        super(options);
        this.hideNotRequired = this.props.hideNotRequired;
        onAppBeforeInit(() => this.resolveNestedModel());
    }
    getEmptyValue() {
        return {};
    }
    resolveNestedModel() {
        this.nestedModel = this.app.modelsResolver.bySchemaObject(this.options);
    }
    toRepresent(data: Record<string, unknown>) {
        const value = this._getValueFromData(data);
        if (value) {
            return this.nestedModel!.innerToRepresent(value);
        }
        return value;
    }
    toInner(data: Record<string, unknown>) {
        const value = this._getValueFromData(data);
        if (value) {
            return this.nestedModel!.representToInner(value);
        }
        return value;
    }
    static get mixins() {
        return [NestedObjectFieldMixin as ComponentOptions<Vue>];
    }
    parseFieldError(data: unknown, instanceData: Record<string, unknown>) {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            return mapObjectValues(data, (item: unknown) =>
                super.parseFieldError(item, instanceData),
            ) as Record<string, unknown>;
        }
        return super.parseFieldError(data, instanceData);
    }
}
