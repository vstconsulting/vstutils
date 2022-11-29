import type { PropType } from 'vue';
import type { Field } from './BaseField';

export const FieldComponentProps = {
    field: { type: Object as PropType<Field>, required: true },
    data: { type: Object, required: true },
    type: { type: String, required: true },
    hideable: { type: Boolean, default: false },
    hideTitle: { type: Boolean, default: false },
    error: { type: [String, Object], default: null },
};

export type FieldComponentPropsType<T> = Omit<typeof FieldComponentProps, 'field'> & {
    field: { type: PropType<T>; required: true };
};

type ExtractRepresent<T> = T extends Field<unknown, infer Represent> ? Represent : never;

export interface SetFieldValueOptions<T extends Field = Field> {
    field: string;
    value: ExtractRepresent<T> | null | undefined;
    markChanged?: boolean;
}

export interface FieldComponentEmits<T extends Field> {
    (e: 'set-value', obj: SetFieldValueOptions<T>): void;
    (e: 'hide-field', field: T): void;
}
