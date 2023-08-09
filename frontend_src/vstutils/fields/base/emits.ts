import type { ObjectEmitsOptions } from 'vue/types/v3-setup-context';
import type { Field } from './BaseField';
import type {
    SetFieldValueOptions,
    ExtractRepresent,
    SetFieldValueParams,
    ReplaceAdditionalPropertyKeyParams,
} from './types';

// --- Component emits ---

function createFieldEmitsDef<T extends Field>() {
    return {
        'set-value': (options: SetFieldValueOptions<T>) => true,
        'hide-field': () => true,
    } satisfies ObjectEmitsOptions;
}

export const FieldEmitsDef = createFieldEmitsDef();
export type FieldEmitsDefType<T extends Field = Field> = ReturnType<typeof createFieldEmitsDef<T>>;
export const FieldEmitsNames = Object.keys(FieldEmitsDef) as unknown as (keyof FieldEmitsDefType)[];

// --- Edit component emits ---

function createEditFieldEmitsDef<T extends Field>() {
    return {
        'set-value': (value: ExtractRepresent<T> | null | undefined, params?: SetFieldValueParams) => true,
        'hide-field': () => true,
        clear: () => true,
    } satisfies ObjectEmitsOptions;
}

export const FieldEditEmitsDef = createEditFieldEmitsDef();
export type FieldEditEmitsDefType<T extends Field = Field> = ReturnType<typeof createEditFieldEmitsDef<T>>;
export const FieldEditEmitsNames = Object.keys(
    FieldEditEmitsDef,
) as unknown as (keyof FieldEditEmitsDefType)[];

// --- Readonly and list component emits ---

function createReadonlyFieldEmitsDef<T extends Field>() {
    return {
        'set-value': (value: ExtractRepresent<T> | null | undefined, params?: SetFieldValueParams) => true,
    } satisfies ObjectEmitsOptions;
}

export const FieldReadonlyEmitsDef = createReadonlyFieldEmitsDef();
export type FieldReadonlyEmitsDefType<T extends Field = Field> = ReturnType<
    typeof createReadonlyFieldEmitsDef<T>
>;
export const FieldReadonlyEmitsNames = Object.keys(
    FieldReadonlyEmitsDef,
) as unknown as (keyof FieldReadonlyEmitsDefType)[];

function fieldLabelEmitsDef() {
    return {
        'replace-key': ({ oldKey, newKey }: ReplaceAdditionalPropertyKeyParams) => true,
        'add-key': (key: string) => true,
        'delete-key': (key: string) => true,
    } satisfies ObjectEmitsOptions;
}

export const FieldLabelEmitsDef = fieldLabelEmitsDef();
export type FieldLabelEmitsDefType = ReturnType<typeof fieldLabelEmitsDef>;
