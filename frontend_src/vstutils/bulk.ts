import { createApiFetch } from './api-fetch';
import type { InitAppConfig } from './init-app';
import { BulkType, makeQueryString, type HttpMethod } from './utils';

const CACHE_NAME = 'bulk-etags';
const IS_NATIVE_CACHE_AVAILABLE = 'caches' in window;

type RawBulk = {
    method: HttpMethod | Uppercase<HttpMethod>;
    path: string | (string | number)[];
    version?: string;
    query?: string;
    headers?: Record<string, unknown>;
    data?: Record<string, unknown>;
};

export type BulkRequest = RawBulk & {
    auth?: boolean;
};

export interface BulkResponseHeaders {
    'X-Query-Data'?: string;
    'Content-Type'?: string;
    ETag?: string;
    [key: string]: string | undefined;
}

export interface BulkResponse<D = unknown> {
    method: HttpMethod | Uppercase<HttpMethod>;
    path: string | string[];
    data: D;
    status: number;
    headers: BulkResponseHeaders;
}

type BulkResponses<T> = T extends unknown[] ? { [Idx in keyof T]: BulkResponse<T[Idx]> } : BulkResponse[];

interface CollectedBulkRequest {
    request: BulkRequest;
    promise: Promise<BulkResponse>;
    callbacks: Record<string, CallableFunction>;
}

type _BulkApiFetch = <Responses = unknown>(request: BulkRequest) => Promise<BulkResponse<Responses>>;
type _BulkApiFetchRaw = <Responses = unknown>(
    requests: BulkRequest[],
    params?: { type?: BulkType; forceAuthRequired?: boolean },
) => Promise<BulkResponses<Responses>>;

export type BulkApiFetch = _BulkApiFetch & { raw: _BulkApiFetchRaw };

const _cached = new WeakMap<InitAppConfig, BulkApiFetch>();

export function createBulkApiFetch(params: { config: InitAppConfig }): BulkApiFetch {
    let bulk = _cached.get(params.config);
    if (!bulk) {
        bulk = _createBulkApiFetch(params);
        _cached.set(params.config, bulk);
    }
    return bulk;
}

function _createBulkApiFetch({ config }: { config: InitAppConfig }): BulkApiFetch {
    const apiFetch = createApiFetch({ config });
    const endpointUrl = new URL(config.api.endpointPath, config.api.url);
    let collectedBulks: CollectedBulkRequest[] = [];
    let sendCollectedBulksTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const sendBulkNotCached: _BulkApiFetchRaw = async <Responses = unknown>(
        requests: BulkRequest[],
        params?: { type?: BulkType; forceAuth?: boolean },
    ) => {
        const auth = params?.forceAuth || requests.some((req) => req.auth);
        const rawRequests: RawBulk[] = requests.map((req) => {
            return {
                method: req.method,
                path: req.path,
                query: req.query,
                headers: req.headers,
                data: req.data,
            };
        });
        const _fetch = auth ? apiFetch : fetch;
        const response = await _fetch(endpointUrl, {
            method: params?.type || BulkType.SIMPLE,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rawRequests),
        });
        const responses = (await response.json()) as BulkResponses<Responses>;
        if (responses.length < requests.length) {
            throw new Error('Responses count does not match requests count');
        }
        return responses;
    };

    const sendBulkCached: _BulkApiFetchRaw = async <Responses = unknown>(
        requests: BulkRequest[],
        params?: { type?: BulkType; forceAuthRequired?: boolean },
    ) => {
        const cache = await window.caches.open(CACHE_NAME);
        const cachedValues = new Map();
        for (let i = 0; i < requests.length; i++) {
            const item = requests[i];
            const request = _bulkItemToRequest(item);
            const cached = await cache.match(request);
            if (cached) {
                cachedValues.set(
                    i,
                    cached.json().then((data) => ({
                        status: cached.status,
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

        const responses = await sendBulkNotCached<Responses>(requests, params);

        for (let i = 0; i < responses.length; i++) {
            const response = responses[i];
            if (response.status === 304 && cachedValues.has(i)) {
                responses[i] = await cachedValues.get(i);
            }
            if (response.method.toUpperCase() === 'GET' && response.status < 300 && response.headers.ETag) {
                try {
                    void cache.put(_bulkItemToRequest(requests[i]), _bulkResultItemToResponse(response));
                } catch (e) {
                    console.warn(e);
                }
            }
        }

        return responses;
    };

    const sendBulk = IS_NATIVE_CACHE_AVAILABLE ? sendBulkCached : sendBulkNotCached;

    async function sendCollectedBulks() {
        const bulks = [...collectedBulks];
        collectedBulks = [];
        const requests = bulks.map(({ request }) => request);
        try {
            const results = await sendBulk(requests);
            for (let idx = 0; idx < results.length; idx++) {
                const result = results[idx];
                bulks[idx].callbacks.resolve(result);
            }
        } catch (e) {
            rejectAll(bulks, e);
        }
    }

    const bulkApiFetch: _BulkApiFetch = async <Responses = undefined>(
        request: BulkRequest,
    ): Promise<BulkResponse<Responses>> => {
        if (sendCollectedBulksTimeoutId) {
            clearTimeout(sendCollectedBulksTimeoutId);
        }
        const callbacks: Record<string, CallableFunction> = {};
        const promise = new Promise<BulkResponse<Responses>>((resolve, reject) => {
            callbacks.resolve = resolve;
            callbacks.reject = reject;
        });
        collectedBulks.push({
            request,
            promise,
            callbacks,
        });
        sendCollectedBulksTimeoutId = setTimeout(() => sendCollectedBulks(), 100);
        return promise;
    };

    const bulkApiFetchRaw: _BulkApiFetchRaw = sendBulk;

    (bulkApiFetch as BulkApiFetch).raw = bulkApiFetchRaw;

    return bulkApiFetch as BulkApiFetch;
}

function _bulkItemToRequest({ method, path, query = '', headers }: BulkRequest) {
    path = Array.isArray(path) ? path.join('/') : path.replace(/^\/|\/$/g, '');
    return new Request(`__bulk/${path}/${makeQueryString(query)}`, {
        method,
        headers: headers as Record<string, string>,
    });
}

function _bulkResultItemToResponse({ data, status, headers }: BulkResponse) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    });
}

function rejectAll(bulks: CollectedBulkRequest[], value: unknown) {
    for (const bulk of bulks) {
        bulk.callbacks.reject(value);
    }
}
