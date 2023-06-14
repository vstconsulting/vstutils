import VueRouter from 'vue-router';
import { getApp } from './app-helpers';

import type { ParameterType } from 'swagger-schema-official';
import type { defineStore } from 'pinia';
import type { Field } from '../fields/base/';
import type { Route, Location } from 'vue-router';
import type { IView } from '../views';

export * from './todo.js';
export * from './app-helpers';

export const EMPTY: unique symbol = Symbol('EMPTY');

export const HttpMethods = {
    GET: 'get',
    POST: 'post',
    PUT: 'put',
    PATCH: 'patch',
    DELETE: 'delete',
} as const;

export type HttpMethod = typeof HttpMethods[keyof typeof HttpMethods];

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

export function deferredPromise<T>() {
    let resolve: (value: T) => void;
    let reject: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
        [resolve, reject] = [res, rej];
    });
    // @ts-expect-error - We know that resolve and reject are defined
    return { promise, reject, resolve };
}

export const RequestTypes = {
    LIST: 'list',
    RETRIEVE: 'retrieve',
    CREATE: 'create',
    UPDATE: 'update',
    PARTIAL_UPDATE: 'partialUpdate',
    REMOVE: 'remove',
} as const;

export type RequestType = typeof RequestTypes[keyof typeof RequestTypes];

/**
 * Method, that converts query object into string
 *
 * @param query
 * @param useBulk - If false adds question mark (?) in front of string
 */
export function makeQueryString(
    query: string | Record<string, unknown> | URLSearchParams | undefined,
    useBulk = false,
): string {
    let queryStr = '';
    if (typeof query === 'string') {
        queryStr = new URLSearchParams(query).toString();
    } else if (query instanceof URLSearchParams) {
        queryStr = query.toString();
    } else if (typeof query === 'object') {
        queryStr = new URLSearchParams(Object.entries(query) as [string, string][]).toString();
    }

    if (!useBulk && queryStr !== '') queryStr = `?${queryStr}`;

    return queryStr;
}

export function createPropertyProxy<Obj extends object, Prop extends keyof Obj>(
    target: Obj,
    propertyToProxy: Prop,
    newValue: Obj[Prop] | typeof EMPTY = EMPTY,
) {
    let value = newValue === EMPTY ? (Reflect.get(target, propertyToProxy) as Obj[Prop]) : newValue;

    return new Proxy(target, {
        get(target, property, receiver): unknown {
            if (property === propertyToProxy) {
                return value;
            }
            return Reflect.get(target, property, receiver);
        },
        set(target, property, updatedValue, receiver) {
            if (property === propertyToProxy) {
                value = updatedValue as Obj[Prop];
                return true;
            }
            return Reflect.set(target, property, updatedValue, receiver);
        },
    });
}

declare const innerDataMarker: unique symbol;
declare const representDataMarker: unique symbol;

export type InnerData<T extends object = Record<string, unknown>> = T & { readonly [innerDataMarker]: true };

export type RepresentData<T extends object = Record<string, unknown>> = T & {
    readonly [representDataMarker]: true;
};

export function emptyInnerData<T extends object = Record<string, unknown>>() {
    return {} as InnerData<T>;
}

export function emptyRepresentData<T extends object = Record<string, unknown>>() {
    return {} as RepresentData<T>;
}

export type StoreInstance<SS extends object> = ReturnType<ReturnType<typeof defineStore<any, SS>>>;

/**
 * Creates an ID generator function. Every execution returns a prefix text
 * concatenated with an incremented number.
 * @param prefix - A text to be concatenated with an incremented number.
 */
export function createUniqueIdGenerator(prefix = '') {
    let count = 0;
    return () => prefix + (++count).toString(10);
}

export const getUniqueId = createUniqueIdGenerator();

export function openPage(
    options: string | (Omit<Location, 'params'> & { params?: Record<string, unknown> }),
): Promise<Route | undefined> {
    const router = getApp().router;

    if (typeof options === 'object') {
        // Get name by path so additional params can be passed
        if (options.path && options.params) {
            const route = router.resolve(options as Location).route;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (route.name && route.name !== NOT_FOUND_ROUTE_NAME && !route.meta?.view?.isDeepNested) {
                options.name = route.name;
                delete options.path;
            }
        }
    } else {
        options = { path: options };
    }
    return router.push(options as Location).catch((error) => {
        if (!VueRouter.isNavigationFailure(error)) {
            throw error;
        }
        return undefined;
    });
}

/**
 * Saves user and local settings. If failed, shows error message.
 * @returns True if any of the settings was changed and successfully saved
 */
export async function saveAllSettings() {
    const app = getApp();
    let saved = false;

    for (const store of [app.localSettingsStore, app.userSettingsStore]) {
        if (store.changed) {
            try {
                await store.save();
                saved = true;
            } catch (e) {
                app.error_handler.defineErrorAndShow(e);
                return false;
            }
        }
    }

    return saved;
}

export const NOT_FOUND_ROUTE_NAME = '404';

export function isNotFoundView(view: IView) {
    return view.routeName === NOT_FOUND_ROUTE_NAME;
}
