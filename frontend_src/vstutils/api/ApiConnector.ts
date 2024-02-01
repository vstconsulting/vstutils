import { BulkType, getCookie, guiLocalSettings, makeQueryString } from '@/vstutils/utils';
import { StatusError } from './StatusError';

import type { AppConfiguration, AppSchema } from '@/vstutils/AppConfiguration';
import type { HttpMethod, InnerData } from '@/vstutils/utils';

const isNativeCacheAvailable = 'caches' in window;

export interface BulkResponseHeaders {
    'X-Query-Data'?: string;
    'Content-Type'?: string;
    ETag?: string;
    [key: string]: string | undefined;
}

interface BulkResponse<D = unknown> {
    method: HttpMethod;
    path: string | string[];
    data: D;
    status: number;
    headers: BulkResponseHeaders;
}

export class APIResponse<T extends BulkResponse['data'] = { detail?: string }> implements BulkResponse {
    status: number;
    data: T;
    method: HttpMethod;
    path: string | string[];
    headers: BulkResponseHeaders;

    constructor({
        status,
        data,
        method,
        path,
        headers,
    }: {
        status: BulkResponse['status'];
        data: T;
        method: BulkResponse['method'];
        path: BulkResponse['path'];
        headers?: BulkResponseHeaders;
    }) {
        APIResponse.checkStatus(status, data);
        this.status = status;
        this.data = data;
        this.method = method;
        this.path = path;
        this.headers = headers ?? {};
    }

    static checkStatus(status: number, data: unknown) {
        if (!(status >= 200 && status < 400)) {
            APIResponse.throwStatusError(status, data);
        }
    }

    static throwStatusError(status: number, data: unknown) {
        throw new StatusError(status, data);
    }

    static async fromFetchResponse<T>(response: Response, method: HttpMethod, path: string) {
        let json = {} as T;
        try {
            json = (await response.json()) as T;
            // eslint-disable-next-line no-empty
        } catch (e) {}
        return new APIResponse<T>({ status: response.status, data: json, path, method });
    }
}

/**
 * Reject all bulk requests with given value
 * @param {Object[]} bulks
 * @param {any=} value
 */
function rejectAll(bulks: CollectedBulkRequest[], value: unknown) {
    for (const bulk of bulks) {
        bulk.callbacks.reject(value);
    }
}

// bulk types

interface RealBulkRequest {
    method: HttpMethod;
    path: string | (string | number)[];
    version?: string;
    query?: string;
    headers?: Record<string, unknown>;
    data?: Record<string, unknown>;
}

interface CollectedBulkRequest<T = unknown> {
    data: RealBulkRequest;
    promise: Promise<APIResponse<T>>;
    callbacks: Record<string, CallableFunction>;
}

interface BulkCollector {
    timeoutId?: ReturnType<typeof setTimeout>;
    bulkParts: CollectedBulkRequest[];
}

// makeRequest types

interface BaseRequest {
    method: HttpMethod;
    path: string | (string | number)[];
    version?: string;
    query?: Record<string, unknown> | string | URLSearchParams;
    headers?: Record<string, unknown>;
}

interface BulkRequest extends BaseRequest {
    data?: Record<string, unknown>;
}

interface FetchRequest extends BaseRequest {
    data?: Record<string, unknown> | FormData;
}

type MakeRequestParamsBulk = { useBulk: true; rawResponse?: false } & BulkRequest;
type MakeRequestParamsFetch = { useBulk?: false; rawResponse?: false } & FetchRequest;
type MakeRequestParamsFetchRaw = { useBulk?: false; rawResponse: true } & FetchRequest;

export type MakeRequestParams = MakeRequestParamsBulk | MakeRequestParamsFetch | MakeRequestParamsFetchRaw;

/**
 * Class, that sends API requests.
 */
export class ApiConnector {
    appConfig: AppConfiguration | null = null;
    openapi: AppSchema | null = null;
    defaultVersion: string | null = null;
    endpointURL: string | null = null;
    headers: Record<string, string | null>;
    bulkCollector: BulkCollector = { bulkParts: [] };
    baseURL: string | null = null;
    disableBulk = false;
    private _etagsCachePrefix: string | null = null;
    private _etagsCacheName: string | null = null;

    /**
     * Constructor of ApiConnector class.
     */
    constructor() {
        this.headers = {};

        const csrftoken = getCookie('csrftoken');
        if (csrftoken) {
            this.headers['X-CSRFToken'] = csrftoken;
        }
    }

    /**
     * Method that sets application configuration. Must be called before making any requests.
     */
    initConfiguration(appConfig: AppConfiguration): this {
        this.appConfig = appConfig;
        this.openapi = appConfig.schema;
        this.defaultVersion = this.openapi.info.version;
        this.endpointURL = String(appConfig.endpointUrl); // TODO fetchMock does not support URL

        // remove version and ending slash from path (/api/v1/)
        const path = this.openapi.basePath?.replace(this.defaultVersion, '').replace(/\/$/, '');
        this.baseURL = `${this.openapi.schemes![0]}://${this.openapi.host!}${path!}`;

        if (isNativeCacheAvailable) {
            this._etagsCachePrefix = 'etags-cache';
            this._etagsCacheName = `${this._etagsCachePrefix}-${this.appConfig.fullUserVersion}`;
            void this._removeOldEtagsCaches();
        }

        return this;
    }

    async _removeOldEtagsCaches() {
        for (const cacheName of await window.caches.keys()) {
            if (cacheName.startsWith(this._etagsCachePrefix!) && cacheName !== this._etagsCacheName) {
                await window.caches.delete(cacheName);
            }
        }
    }

    async makeRequest<T = unknown>(
        req: MakeRequestParamsBulk | MakeRequestParamsFetch,
    ): Promise<APIResponse<T>>;
    async makeRequest(req: MakeRequestParamsFetchRaw): Promise<Response>;
    async makeRequest<T = unknown>(req: MakeRequestParams): Promise<APIResponse<T> | Response> {
        if (req.useBulk && !this.disableBulk) {
            const realBulk: RealBulkRequest = {
                method: req.method,
                path: req.path,
            };
            if (req.version) {
                realBulk.version = req.version;
            }
            const query = makeQueryString(req.query, true);
            if (query) {
                realBulk.query = query;
            }
            if (req.headers) {
                realBulk.headers = req.headers;
            }
            if (req.data) {
                realBulk.data = req.data;
            }
            const response = await this.bulkQuery<T>(realBulk);
            return new APIResponse(response);
        } else {
            const headers = { ...this.headers, ...req.headers } as Record<string, string>;
            let preparedData: RequestInit['body'];

            if (req.data !== undefined) {
                if (req.data instanceof FormData) {
                    preparedData = req.data;
                } else {
                    preparedData = JSON.stringify(req.data);
                    headers['Content-Type'] = 'application/json';
                }
            }

            const pathStr = Array.isArray(req.path) ? req.path.join('/') : req.path.replace(/^\//, '');
            const pathToSend = `${this.getFullUrl(pathStr)}${makeQueryString(req.query)}`;

            const response = await fetch(pathToSend, {
                method: req.method,
                headers,
                body: preparedData,
            });

            if (req.rawResponse) {
                return response;
            }

            return await APIResponse.fromFetchResponse(response, req.method, pathToSend);
        }
    }

    getFullUrl(path: string) {
        path = path.replace(/^\/|\/$/g, '');
        return `${this.baseURL!}/${this.defaultVersion!}/${path}/`;
    }

    _bulkItemToRequest({ version = this.defaultVersion!, method, path, query = '', headers }: BulkRequest) {
        path = Array.isArray(path) ? path.join('/') : path.replace(/^\/|\/$/g, '');
        return new Request(`${this.baseURL!}/${version}/${path}/${makeQueryString(query)}`, {
            method,
            headers: headers as Record<string, string>,
        });
    }

    _bulkResultItemToResponse({ data, status, headers }: BulkResponse) {
        return new Response(JSON.stringify(data), {
            status,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        });
    }

    async sendCachedBulk(requests: RealBulkRequest[], type = BulkType.SIMPLE) {
        const cachedValues = new Map();
        const cache = await window.caches.open(this._etagsCacheName!);
        for (let i = 0; i < requests.length; i++) {
            const item = requests[i];
            const request = this._bulkItemToRequest(item);
            const cached = await cache.match(request);
            if (cached) {
                cachedValues.set(
                    i,
                    cached.json().then((data) => ({
                        status: cached.status,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        data,
                        headers: new Proxy(cached.headers, {
                            get(target, name: string | symbol, receiver) {
                                if (name in target || typeof name === 'symbol') {
                                    return Reflect.get(target, name, receiver) as unknown;
                                }
                                return target.get(name);
                            },
                        }),
                    })),
                );
                if (!item.headers) item.headers = {};
                item.headers['If-None-Match'] = cached.headers.get('ETag');
            }
        }

        const responses = await this.sendBulk(requests, type);

        for (let i = 0; i < responses.length; i++) {
            const response = responses[i];
            if (response.status === 304 && cachedValues.has(i)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                responses[i] = await cachedValues.get(i);
            }
            if (response.method === 'get' && response.status < 300 && response.headers.ETag) {
                try {
                    void cache.put(
                        this._bulkItemToRequest(requests[i]),
                        this._bulkResultItemToResponse(response),
                    );
                } catch (e) {
                    console.warn(e);
                }
            }
        }

        return responses;
    }

    async sendBulk<Responses = undefined>(requests: RealBulkRequest[], type = BulkType.SIMPLE) {
        const response = await fetch(this.endpointURL!, {
            method: type,
            headers: { ...this.headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(requests),
        });

        const data = (await response.json()) as unknown;

        return data as Promise<
            Responses extends unknown[]
                ? { [Idx in keyof Responses]: BulkResponse<Responses[Idx]> }
                : BulkResponse[]
        >;
    }

    /**
     * Method, that collects several bulk requests into one.
     */
    bulkQuery<T = Record<string, unknown>>(data: RealBulkRequest): Promise<APIResponse<T>> {
        if (this.bulkCollector.timeoutId) {
            clearTimeout(this.bulkCollector.timeoutId);
        }

        const callbacks: Record<string, CallableFunction> = {};
        const promise = new Promise<APIResponse<T>>((resolve, reject) => {
            callbacks.resolve = resolve;
            callbacks.reject = reject;
        });

        this.bulkCollector.bulkParts.push({ data, promise, callbacks });
        this.bulkCollector.timeoutId = setTimeout(
            () => void this._sendCollectedBulks(),
            (guiLocalSettings.get('guiApi.real_query_timeout') as number | null) ?? 100,
        );

        return promise;
    }

    /**
     * Method, that sends one big bulk request to API.
     */
    async _sendCollectedBulks() {
        const bulkParts = [...this.bulkCollector.bulkParts];
        this.bulkCollector.bulkParts = [];
        const bulkData = bulkParts.map((bulkPart) => bulkPart.data);

        try {
            let results;
            if (this._etagsCacheName) {
                try {
                    results = await this.sendCachedBulk(bulkData);
                } catch {
                    results = await this.sendBulk(bulkData);
                }
            } else {
                results = await this.sendBulk(bulkData);
            }
            for (const [idx, item] of results.entries()) {
                try {
                    APIResponse.checkStatus(item.status, item.data);
                    bulkParts[idx].callbacks.resolve(item);
                } catch (e) {
                    bulkParts[idx].callbacks.reject(item);
                }
            }
        } catch (error) {
            rejectAll(bulkParts, error);
        }
    }
    /**
     * Method returns URL of API host (server).
     */
    getHostUrl() {
        const openapi = this.openapi!;
        return `${openapi.schemes![0]}://${openapi.host!}`;
    }
    /**
     * Method returns string, containing time zone of API host.
     */
    getTimeZone() {
        return this.openapi?.info['x-settings'].time_zone as string;
    }
    /**
     * Method returns relative path (from host url) to the directory with static path.
     */
    getStaticPath() {
        return this.openapi?.info['x-settings'].static_path;
    }
    /**
     * Method returns id of user, that is now authorized and uses application.
     */
    getUserId() {
        return this.openapi?.info['x-user-id'] as number | string;
    }
    /**
     * Method, that loads data of authorized user.
     */
    loadUser() {
        return this.bulkQuery<InnerData>({
            path: ['user', this.getUserId()],
            method: 'get',
        }).then((response) => {
            return response.data;
        });
    }
}

export const apiConnector = new ApiConnector();
