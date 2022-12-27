import { computed, h } from 'vue';

import { BaseField, defineFieldComponent } from '@/vstutils/fields/base';
import { onAppBeforeInit } from '@/vstutils/signals';

import type {
    ExtractInner,
    ExtractRepresent,
    Field,
    FieldOptions,
    FieldXOptions,
} from '@/vstutils/fields/base';
import type { FieldDefinition } from './FieldsResolver';

const StaticValueFieldMixin = defineFieldComponent<StaticValueField>((props, { listeners }) => {
    const staticValue = computed<ExtractRepresent<StaticValueField> | null | undefined>(() => {
        if (typeof props.field.staticValue === 'function') {
            return props.field.staticValue(props.data);
        }
        return props.field.staticValue;
    });

    const dataWithStaticValue = computed(() => {
        return Object.assign({}, props.data, { [props.field.name]: staticValue.value });
    });

    return () =>
        h(props.field.realField!.getComponent(), {
            props: {
                field: props.field.realField,
                data: dataWithStaticValue.value,
                type: props.type,
            },
            on: listeners,
        });
});

interface StaticValueFieldXOptions<TField> extends FieldXOptions {
    realField: FieldDefinition;
    staticValue: ExtractInner<TField> | ((data: Record<string, unknown>) => ExtractInner<TField>);
}

export class StaticValueField<TField extends Field = Field> extends BaseField<
    ExtractInner<TField>,
    ExtractRepresent<TField>,
    StaticValueFieldXOptions<TField>
> {
    realField?: TField;
    staticValue: ExtractInner<TField> | ((data: Record<string, unknown>) => ExtractInner<TField>);

    constructor(options: FieldOptions<StaticValueFieldXOptions<TField>, ExtractInner<TField>>) {
        super(options);
        this.staticValue = this.props.staticValue;
        onAppBeforeInit(() => this.resolveRealField());
    }

    resolveRealField() {
        this.realField = this.app.fieldsResolver.resolveField(this.props.realField, this.name) as TField;
    }

    static get mixins() {
        return [StaticValueFieldMixin];
    }

    toRepresent(data: Record<string, unknown>): ExtractRepresent<TField> | null | undefined {
        return this.realField!.toRepresent({ ...data, [this.name]: this.staticValue }) as
            | ExtractRepresent<TField>
            | null
            | undefined;
    }
}
