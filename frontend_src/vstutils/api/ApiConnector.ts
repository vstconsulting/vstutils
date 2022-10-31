import { AppConfiguration, AppSchema } from '../AppConfiguration';
import { guiLocalSettings, getCookie, makeQueryString, BulkType, HttpMethods } from '../utils';
import StatusError from './StatusError.js';

const isNativeCacheAvailable = 'caches' in window;

class APIResponse<T = { detail?: string } | string> {
    status: number;
    data: T;

    constructor(status: number, data: T) {
        APIResponse.checkStatus(status, data);
        this.status = status;
        this.data = data;
    }

    static checkStatus(status: number, data: unknown) {
        if (!(status >= 200 && status < 400)) {
            throw new StatusError(status, data);
        }
    }
}

/**
 * Reject all bulk requests with given value
 * @param {Object[]} bulks
 * @param {any=} value
 */
function rejectAll(bulks: CollectedBulkRequest<unknown>[], value: unknown) {
    for (const bulk of bulks) {
        bulk.callbacks.reject(value);
    }
}

interface BulkRequest {
    method: HttpMethods;
    path: string | (string | number)[];
    version?: string;
    data?: Record<string, unknown>;
    query?: Record<string, string> | string;
    headers?: Record<string, unknown>;
}

interface AnyRequest extends BulkRequest {
    useBulk: boolean;
}

interface BulkResponse {
    method: HttpMethods;
    path: string | string[];
    data: Record<string, unknown>;
    status: number;
    headers: Record<string, unknown>;
}

interface CollectedBulkRequest<T = { detail?: string } | string> {
    data: BulkRequest;
    promise: Promise<APIResponse<T>>;
    callbacks: Record<string, CallableFunction>;
}

interface BulkCollector<T = { detail?: string } | string> {
    timeoutId?: ReturnType<typeof setTimeout>;
    bulkParts: CollectedBulkRequest<T>[];
}

/**
 * Class, that sends API requests.
 */
class ApiConnector {
    appConfig: AppConfiguration | null = null;
    openapi: AppSchema | null = null;
    defaultVersion: string | null = null;
    endpointURL: string | null = null;
    headers: Record<string, string | null>;
    bulkCollector: BulkCollector<unknown> = { bulkParts: [] };
    baseURL: string | null = null;
    private _etagsCachePrefix: string | null = null;
    private _etagsCacheName: string | null = null;

    /**
     * Constructor of ApiConnector class.
     */
    constructor() {
        this.headers = {
            'X-CSRFToken': getCookie('csrftoken'),
        };
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

    async makeRequest({
        method,
        version = this.defaultVersion!,
        path,
        query = undefined,
        data = undefined,
        headers = {},
        useBulk = false,
    }: AnyRequest) {
        if (useBulk) {
            // TODO make fetch and bulk throw same things
            const response = await this.bulkQuery({
                method,
                version,
                path,
                query: makeQueryString(query, useBulk),
                data,
                headers,
            });
            return new APIResponse(response.status, response.data);
        } else {
            let pathStr = Array.isArray(path) ? path.join('/') : path;
            if (pathStr.startsWith('/')) pathStr = pathStr.substring(1);
            if (pathStr.endsWith('/')) pathStr = pathStr.substring(0, pathStr.length - 1);

            let strData = data as unknown;
            if (typeof data !== 'string') {
                strData = JSON.stringify(data);
            }

            const fetchConfig: RequestInit = {
                method: method,
                headers: { ...this.headers, ...headers } as Record<string, string>,
                body: strData as string,
            };

            const response = await fetch(
                `${this.baseURL!}/${version}/${pathStr}/${makeQueryString(query)}`,
                fetchConfig,
            );

            let json;
            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                json = await response.json();
                // eslint-disable-next-line no-empty
            } catch (e) {}

            return new APIResponse(response.status, json);
        }
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

    async sendCachedBulk(requests: BulkRequest[], type = BulkType.SIMPLE) {
        const cachedValues = new Map();
        const cache = await window.caches.open(this._etagsCacheName!);
        for (let i = 0; i < requests.length; i++) {
            const item = requests[i];
            const request = this._bulkItemToRequest(item);
            const cached = await cache.match(request);
            if (cached) {
                cachedValues.set(
                    i,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    cached.json().then((data) => ({ status: cached.status, data })),
                );
                if (!item.headers) item.headers = {};
                item.headers.HTTP_IF_NONE_MATCH = cached.headers.get('ETag');
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

    sendBulk(requests: BulkRequest[], type = BulkType.SIMPLE): Promise<BulkResponse[]> {
        return fetch(this.endpointURL!, {
            method: type,
            headers: { ...this.headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(requests),
        }).then((response) => response.json()) as Promise<BulkResponse[]>;
    }

    /**
     * Method, that collects several bulk requests into one.
     */
    bulkQuery<T = Record<string, unknown>>(data: BulkRequest): Promise<APIResponse<T>> {
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
        return this.bulkQuery({
            path: ['user', this.getUserId()],
            method: HttpMethods.GET,
        }).then((response) => {
            return response.data;
        });
    }
}

/**
 * ApiConnector instance
 *
 * @type {ApiConnector}
 */
const apiConnector = new ApiConnector();

export { ApiConnector, apiConnector, APIResponse };
