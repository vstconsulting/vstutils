import type { ExtractPropTypes, PropType } from 'vue';
import type { Field } from './BaseField';

export const FieldPropsDef = {
    field: { type: Object as PropType<Field>, required: true as const },
    data: { type: Object as PropType<Record<string, unknown>>, required: true as const },
    type: { type: String as PropType<'edit' | 'list' | 'readonly'>, required: true as const },
    hideable: { type: Boolean, default: false },
    hideTitle: { type: Boolean, default: false },
    error: { type: [String, Object, Array], default: null },
};

export type FieldPropsDefType<T> = Omit<typeof FieldPropsDef, 'field'> & {
    field: { type: PropType<T>; required: true };
};

export type FieldProps<TField extends Field = Field> = ExtractPropTypes<FieldPropsDefType<TField>>;

export type ExtractInner<T> = T extends Field<infer Inner> ? Inner : never;
export type ExtractRepresent<T> = T extends Field<unknown, infer Represent> ? Represent : never;
export type ExtractXOptions<T> = T extends Field<unknown, unknown, infer XOptions> ? XOptions : never;

export interface SetFieldValueOptions<T extends Field = Field> {
    field: string;
    value: ExtractRepresent<T> | null | undefined;
    markChanged?: boolean;
}

export interface FieldComponentEmits<T extends Field> {
    (e: 'set-value', obj: SetFieldValueOptions<T>): void;
    (e: 'hide-field', field: T): void;
}
