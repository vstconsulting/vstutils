import type { Field } from '#vstutils/fields/base';

export interface SetFieldValueParams {
    markChanged?: boolean;
    replaceKeyWith?: string;
    deleteKey?: boolean;
}

export interface SetFieldValueOptions<T extends Field = Field> extends SetFieldValueParams {
    field: string;
    value?: ExtractRepresent<T> | null | undefined;
}

export interface ReplaceAdditionalPropertyKeyParams {
    oldKey: string;
    newKey: string;
}

export type ExtractInner<T> = T extends Field<infer Inner> ? Inner : never;
export type ExtractRepresent<T> = T extends Field<unknown, infer Represent> ? Represent : never;
export type ExtractXOptions<T> = T extends Field<unknown, unknown, infer XOptions> ? XOptions : never;
