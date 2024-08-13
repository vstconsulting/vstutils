import type { Schema, ParameterCollectionFormat, ParameterType } from 'swagger-schema-official';
import type { ModelConstructor, Model } from '#vstutils/models/Model';
import type { RepresentData, InnerData } from '#vstutils/utils';
import type { FieldInitialValueConfig } from '../../schema';
import type { Component } from 'vue';

export interface ModelPropertyDescriptor<Represent> extends PropertyDescriptor {
    get(this: Model): Represent | null | undefined;
    set(this: Model, value: Represent | null | undefined): void;
}

export interface RedirectOptions {
    operation_name?: string;
    depend_field?: string;
    concat_field_name?: boolean;
}

export interface FieldXOptions {
    prependText?: string;
    appendText?: string;
    redirect?: RedirectOptions;
    translateFieldName?: string;
    disableLabelTranslation?: boolean;
    initialValue?: FieldInitialValueConfig;
    [key: string]: unknown;
}

export type DefaultXOptions = FieldXOptions | undefined;

export type FieldOptions<XOptions extends DefaultXOptions, Inner> = Omit<Schema, 'default' | 'items'> & {
    allowEmptyValue?: boolean;
    collectionFormat?: ParameterCollectionFormat;
    default?: Inner;
    hidden?: boolean;
    items?: FieldOptions<DefaultXOptions, unknown>;
    name: string;
    required?: boolean;
    title?: string;
    'x-collectionFormat'?: ParameterCollectionFormat;
    'x-format'?: string;
    'x-hidden'?: boolean;
    'x-nullable'?: boolean;
    'x-validators'?: {
        extensions?: string[];
        min_width?: number;
        max_width?: number;
        min_height?: number;
        max_height?: number;
    };
} & (XOptions extends undefined ? { 'x-options'?: XOptions } : { 'x-options': XOptions });

export interface Field<
    Inner = unknown,
    Represent = unknown,
    XOptions extends DefaultXOptions = DefaultXOptions,
> {
    options: FieldOptions<XOptions, Inner>;
    props: XOptions;

    type: ParameterType;
    format?: string;

    name: string;
    title: string;
    required: boolean;
    readOnly: boolean;
    nullable: boolean;
    description?: string;
    hidden: boolean;

    hasDefault: boolean;
    default?: Inner;

    prependText?: string;
    appendText?: string;

    redirect?: RedirectOptions;

    model?: ModelConstructor;

    translateFieldName: string;
    disableLabelTranslation: boolean;
    fkLinkable: boolean;

    getComponent(): Component;
    getLabelComponent(): Component;
    getArrayComponent(): Component | undefined;

    toInner(data: RepresentData): Inner | null | undefined;
    toRepresent(data: InnerData): Represent | null | undefined;

    validateValue(data: RepresentData): Represent | null | undefined;
    validateInner(data: InnerData): void;
    translateValue(value: Represent): Represent;

    getValue(data?: InnerData): Inner | null | undefined;
    getValue(data?: RepresentData): Represent | null | undefined;

    prepareFieldForView(path: string): void;

    getInitialValue(args?: { requireValue: boolean }): Inner | undefined | null;
    getEmptyValue(): Inner | undefined | null;

    toDescriptor(): ModelPropertyDescriptor<Represent>;

    isEqual(other: Field<any, any, any>): boolean;

    isSameValues(data1: RepresentData, data2: RepresentData): boolean;

    parseFieldError(errorData: unknown, instanceData: InnerData): unknown;

    getContainerCssClasses(data: RepresentData): string[] | undefined;
}

export type FieldMixin = Component;
