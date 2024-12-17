import type { RepresentData } from '#vstutils/utils';
import type { ExtractPropTypes, PropType } from 'vue';
import type { Field } from './BaseField';
import type { ExtractRepresent } from './types';

// --- Component props ---

export type FieldComponentType = 'edit' | 'list' | 'readonly';

export const FieldPropsDef = {
    field: { type: Object as PropType<Field>, required: true as const },
    data: { type: Object as PropType<RepresentData>, required: true as const },
    type: { type: String as PropType<FieldComponentType>, required: true as const },
    hideable: { type: Boolean, default: false },
    hideTitle: { type: Boolean, default: false },
    error: { type: [String, Object, Array], default: null },
};

export const FieldLabelPropsDef = {
    id: { type: String, default: undefined },
    field: { type: Object as PropType<Field>, required: true as const },
    value: { required: false },
    type: { type: String as PropType<FieldComponentType>, required: true as const },
    data: { type: Object as PropType<RepresentData> },
    error: { type: [String, Object, Array], default: null },
};

export type FieldLabelPropsDefType<TField extends Field = Field> = Omit<
    typeof FieldLabelPropsDef,
    'field'
> & {
    field: { type: PropType<TField>; required: true };
};

export type FieldPropsDefType<T> = Omit<typeof FieldPropsDef, 'field'> & {
    field: { type: PropType<T>; required: true };
};

export type FieldProps<TField extends Field = Field> = ExtractPropTypes<FieldPropsDefType<TField>>;

// --- Readonly and list components props ---

export const FieldReadonlyPropsDef = {
    field: { type: Object as PropType<Field>, required: true as const },
    data: { type: Object as PropType<RepresentData>, required: true as const },
    value: {},
};

export type FieldReadonlyPropsDefType<T> = Omit<typeof FieldReadonlyPropsDef, 'field' | 'value'> & {
    field: { type: PropType<T>; required: true };
    value: { type: PropType<ExtractRepresent<T> | null | undefined> };
};

export type FieldReadonlyProps<T> = ExtractPropTypes<FieldReadonlyPropsDefType<T>>;

// --- Edit component props ---

export const FieldEditPropsDef = {
    field: { type: Object as PropType<Field>, required: true as const },
    data: { type: Object as PropType<RepresentData>, required: true as const },
    value: {},
    hideable: { type: Boolean, default: false },
    error: { type: [String, Object, Array], default: null },
};

export type FieldEditPropsDefType<T> = Omit<typeof FieldEditPropsDef, 'field' | 'value'> & {
    field: { type: PropType<T>; required: true };
    value: { type: PropType<ExtractRepresent<T> | null | undefined> };
};

export type FieldEditProps<T> = ExtractPropTypes<FieldEditPropsDefType<T>>;
