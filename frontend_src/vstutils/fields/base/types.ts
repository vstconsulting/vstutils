import type { Field } from './BaseField';

export interface SetFieldValueOptions<T extends Field = Field> {
    field: string;
    value: ExtractRepresent<T> | null | undefined;
    markChanged?: boolean;
}

export type ExtractInner<T> = T extends Field<infer Inner> ? Inner : never;
export type ExtractRepresent<T> = T extends Field<unknown, infer Represent> ? Represent : never;
export type ExtractXOptions<T> = T extends Field<unknown, unknown, infer XOptions> ? XOptions : never;
