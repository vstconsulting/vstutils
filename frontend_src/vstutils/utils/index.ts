import { ParameterType } from 'swagger-schema-official';
import type { Field } from '../fields/base/';

export * from './todo.js';
export * from './app-helpers';

export enum HttpMethods {
    GET = 'get',
    POST = 'post',
    PUT = 'put',
    PATCH = 'patch',
    DELETE = 'delete',
}

export enum BulkType {
    SIMPLE = 'put',
    TRANSACTIONAL = 'post',
    ASYNC = 'patch',
}

/**
 * The maximum is exclusive and the minimum is inclusive
 */
export function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
}

export function tableColumnClasses(field: Field) {
    const classes = ['column', `column-${field.name}`, `column-type-${field.type}`];
    if (field.format) {
        classes.push(`column-format-${field.format}`);
    }
    if (field.model?.pkField === field) {
        classes.push('pk-column');
    }
    return classes;
}

export const SCHEMA_DATA_TYPE: Record<ParameterType, ParameterType> = {
    string: 'string',
    number: 'number',
    integer: 'integer',
    boolean: 'boolean',
    object: 'object',
    file: 'file',
    array: 'array',
};

export const SCHEMA_DATA_TYPE_VALUES = Object.values(SCHEMA_DATA_TYPE);

export const ENUM_TYPES = [SCHEMA_DATA_TYPE.string, SCHEMA_DATA_TYPE.integer, SCHEMA_DATA_TYPE.number];

export const X_OPTIONS = 'x-options';
