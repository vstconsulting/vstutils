import type { ParameterType } from 'swagger-schema-official';
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

/**
 * Function, that converts instance of ArrayBuffer to Base64 string.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;

    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binary);
}

export function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(reader.result as string));
        reader.addEventListener('error', reject);
        reader.readAsDataURL(file);
    });
}

/**
 * Removes base64 prefix from content of the file
 */
export function removeBase64Prefix(content: string) {
    return content.slice(content.indexOf(',') + 1);
}

/**
 * Function that reads file to vstutils named binary files format
 */
export async function readFileAsObject(file: File) {
    return {
        name: file.name || null,
        content: removeBase64Prefix(await readFileAsDataUrl(file)),
        mediaType: file.type || null,
    };
}

export async function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(reader.result as string));
        reader.addEventListener('error', reject);
        reader.readAsText(file);
    });
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', reject);
        img.src = url;
    });
}
