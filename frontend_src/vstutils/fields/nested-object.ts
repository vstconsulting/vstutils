import { computed, defineComponent, h } from 'vue';

import { ModelFields } from '@/vstutils/components/page';
import type {
    Field,
    FieldOptions,
    FieldPropsDefType,
    FieldXOptions,
    SetFieldValueOptions,
} from '@/vstutils/fields/base';
import { BaseFieldLabel } from '@/vstutils/fields/base';
import { BaseField, FieldPropsDef, useFieldWrapperClasses } from '@/vstutils/fields/base';
import { onAppBeforeInit } from '@/vstutils/signals';
import { emptyInnerData, mapObjectValues } from '@/vstutils/utils';

import type { Model } from '@/vstutils/models';
import type { InnerData, RepresentData } from '@/vstutils/utils';
import type { ModelDefinition } from '../AppConfiguration';

type TInner = InnerData;
type TRepresent = RepresentData;

export const NestedObjectFieldMixin = defineComponent({
    props: FieldPropsDef as FieldPropsDefType<NestedObjectField>,
    emits: ['set-value'],
    setup(props, { emit }) {
        const modelClass = props.field.nestedModel!;
        const value = computed(() => {
            return props.field.getValue(props.data);
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
            const val = value.value ? modelClass.fromRepresentData(value.value).getViewFieldString() : '';
            return [h('div', val)];
        }

        function setFieldValue({ field, value: newVal, ...options }: SetFieldValueOptions) {
            emit('set-value', {
                field: props.field.name,
                value: { ...value.value, [field]: newVal },
                ...options,
            });
        }

        function renderDetail() {
            return [
                h(BaseFieldLabel, {
                    props: { field: props.field, error: props.error, type: props.type },
                }),
                h(ModelFields, {
                    props: {
                        editable: props.type === 'edit' && !props.field.readOnly,
                        data: sandbox,
                        model: props.field.nestedModel,
                        fieldsErrors: props.error,
                        hideNotRequired: props.field.hideNotRequired,
                    },
                    on: { 'set-value': setFieldValue },
                }),
            ];
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
    nestedModel: typeof Model | null = null;
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
}
