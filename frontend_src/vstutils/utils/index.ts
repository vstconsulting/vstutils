import VueRouter from 'vue-router';
import { getApp } from './app-helpers';

import type { ParameterType } from 'swagger-schema-official';
import type { defineStore } from 'pinia';
import type { Field } from '../fields/base/Field';
import type { Route, Location } from 'vue-router';
import type { Model, ModelConstructor } from '#vstutils/models';
import type { IView, PageView, Sublink } from '#vstutils/views';

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

export type HttpMethod = (typeof HttpMethods)[keyof typeof HttpMethods];

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

export type RequestType = (typeof RequestTypes)[keyof typeof RequestTypes];

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

export const innerDataMarker = '__inner_data';
export const representDataMarker = '__represent_data';

export type InnerData<T extends object = Record<string, unknown>> = T & {
    readonly [innerDataMarker]: true;
};

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

export function joinPaths(...paths: (string | number | undefined | null)[]) {
    return (
        paths.reduce<string>((value, path) => value + '/' + String(path ?? '').replace(/^\/|\/$/g, ''), '') +
        '/'
    );
}

/**
 * Function that formats path from params and replaces last param with instance's id
 */
export function formatPath(path: string, params: Record<string, unknown>, instance?: Model) {
    for (const [name, value] of Object.entries(params)) {
        path = path.replace(`{${name}}`, String(value));
    }

    if (instance) {
        return path.replace(/{.+}/, String(instance.getPkValue()));
    }

    return path;
}

export async function openSublink(sublink: Sublink, instance?: Model) {
    const { router, api, error_handler } = getApp();

    let path = sublink.appendFragment
        ? joinPaths(router.currentRoute.path, sublink.appendFragment)
        : sublink.href!;
    if (typeof path === 'function') {
        path = path();
    }
    path = formatPath(path, router.currentRoute.params, instance);

    if (sublink.isFileResponse) {
        try {
            const response = sublink.external
                ? await fetch(path)
                : await api.makeRequest({ rawResponse: true, method: 'get', path: path, auth: sublink.auth });
            await downloadResponse(response);
        } catch (e) {
            error_handler.defineErrorAndShow(e);
        }
        return;
    }

    if (sublink.external) {
        window.open(path, '_blank');
        return;
    }

    return router.push(path);
}

export function getRedirectUrlFromResponse(responseData: any, modelClass: ModelConstructor | undefined) {
    if (!responseData || typeof responseData !== 'object' || !modelClass) return;

    const app = getApp();

    const field = iterFind(modelClass.fields.values(), (field) => field.redirect);
    if (!field) return;

    const redirect = field.redirect!;

    let operationId = '';

    if (redirect.depend_field) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const dependFieldValue = responseData[redirect.depend_field];
        const dependFieldStrValue = dependFieldValue ? String(dependFieldValue) : '';
        operationId += dependFieldStrValue.toLowerCase();
    }
    if (!operationId || redirect.concat_field_name) {
        operationId = operationId + (redirect.operation_name ?? '');
    }

    operationId += '_get';

    const view: IView | null = app.viewsTree.findInAllPaths(
        (view) => view.operationId === operationId && view,
    );

    if (!view) {
        console.warn(`Can't find redirect view for operationId: ${operationId}`, field, responseData);
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const value = responseData[field.name];

    if (value === undefined || value === null) {
        return;
    }

    return formatPath(view.path, {
        ...app.router.currentRoute.params,
        [(view as PageView).pkParamName!]: value as string,
    });
}

/**
 * Function that returns first item from iterator for which callbackFn will return true
 */
export function iterFind<T>(iterable: Iterable<T>, callbackFn: (item: T) => unknown) {
    for (const item of iterable) {
        if (callbackFn(item)) {
            return item;
        }
    }
    return undefined;
}

export function parseFileResponseName(response: Response) {
    const contentDisposition = response.headers.get('Content-Disposition');
    if (!contentDisposition) {
        return '';
    }

    const fileNameMatch = /filename="(.+)"/.exec(contentDisposition);
    if (!fileNameMatch) {
        return '';
    }

    return fileNameMatch[1];
}

let responseDownloadHandler = defaultDownloadResponseHandler;
export function setFileDownloadHandler(handler: (response: Response) => Promise<void>) {
    responseDownloadHandler = handler;
}

export async function defaultDownloadResponseHandler(response: Response) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const fileName = parseFileResponseName(response);

    const a = document.createElement('a');
    a.href = url;
    if (fileName) {
        a.download = fileName;
    }

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function downloadResponse(response: Response) {
    return responseDownloadHandler(response);
}

/**
 * Calculates width and height of inner box which should be inside a wrapper box
 * with wrapperWidth and wrapperHeight size. If aspectRatio isn't given,
 * than it will be inherited from wrapper box. If padding is not given, than
 * at least one side of inner box will aligned with side of wrapper box.
 */
export function fitToWrapper({
    wrapperWidth,
    wrapperHeight,
    aspectRatio = undefined,
    padding = 0,
}: {
    wrapperWidth: number;
    wrapperHeight: number;
    aspectRatio?: number;
    padding?: number;
}): { width: number; height: number } {
    if (!(padding >= 0 && padding < 1)) {
        throw Error('padding must be within [0, 1).');
    }
    if (aspectRatio === undefined) {
        aspectRatio = wrapperWidth / wrapperHeight;
    }
    if (aspectRatio <= 0) {
        throw Error('aspectRatio must be greater than 0.');
    }

    let width = 0;
    let height = 0;
    const factor = 1 - padding;

    if (aspectRatio > 1) {
        if (wrapperWidth > wrapperHeight && wrapperHeight * factor * aspectRatio <= wrapperWidth) {
            height = wrapperHeight * factor;
            width = height * aspectRatio;
        } else {
            width = wrapperWidth * factor;
            height = width / aspectRatio;
        }
    } else {
        if (wrapperWidth < wrapperHeight && (wrapperWidth * factor) / aspectRatio <= wrapperHeight) {
            width = wrapperWidth * factor;
            height = width / aspectRatio;
        } else {
            height = wrapperHeight * factor;
            width = height * aspectRatio;
        }
    }

    return { width, height };
}

export function capitalize(string: string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

export function nameToTitle(name: string) {
    return String(name)
        .replace(/_/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

export function lower(value: string) {
    if (!value) {
        return '';
    }
    value = value.toString();
    return value.toLowerCase();
}

export function escapeHtml(unsafe: string) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export const OBJECT_NOT_FOUND_TEXT = '[Object not found]';

export type MaybePromise<T> = T | Promise<T>;
