import type { AppSchema } from '@/vstutils/schema';
import type { BulkType, HttpMethod, InnerData } from '@/vstutils/utils';
import { makeQueryString } from '@/vstutils/utils';
import { createApiFetch } from '../api-fetch';
import { type IApp } from '../app';
import {
    createBulkApiFetch,
    type BulkApiFetch,
    type BulkResponse,
    type BulkResponseHeaders,
    BulkRequest as BaseBulkRequest,
} from '../bulk';
import { type InitAppConfig } from '../init-app';
import { StatusError } from './StatusError';

export class APIResponse<T extends BulkResponse['data'] = { detail?: string }> implements BulkResponse {
    status: number;
    data: T;
    method: HttpMethod | Uppercase<HttpMethod>;
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

    static async fromFetchResponse<T>(
        response: Response,
        method: HttpMethod | Uppercase<HttpMethod>,
        path: string,
    ) {
        let json = {} as T;
        try {
            json = (await response.json()) as T;
            // eslint-disable-next-line no-empty
        } catch (e) {}
        return new APIResponse<T>({ status: response.status, data: json, path, method });
    }
}

// makeRequest types

interface BaseRequest {
    method: HttpMethod;
    path: string | (string | number)[];
    version?: string;
    query?: Record<string, unknown> | string | URLSearchParams;
    headers?: Record<string, unknown>;
}

interface FetchRequest extends BaseRequest {
    data?: Record<string, unknown> | FormData;
}

type MakeRequestParamsBulk = { useBulk: true; rawResponse?: false } & Omit<BaseBulkRequest, 'query'> & {
        query?: string | Record<string, unknown> | URLSearchParams;
    };
type MakeRequestParamsFetch = { useBulk?: false; rawResponse?: false } & FetchRequest;
type MakeRequestParamsFetchRaw = { useBulk?: false; rawResponse: true } & FetchRequest;

export type MakeRequestParams = MakeRequestParamsBulk | MakeRequestParamsFetch | MakeRequestParamsFetchRaw;

/**
 * Class, that sends API requests.
 */
export class ApiConnector {
    appConfig: InitAppConfig | null = null;
    openapi: AppSchema | null = null;
    defaultVersion: string | null = null;
    endpointURL: string | null = null;
    headers: Record<string, string | null | undefined>;
    baseURL: string | null = null;
    disableBulk = false;
    fetch: typeof fetch = window.fetch;
    bulk?: BulkApiFetch;

    /**
     * Constructor of ApiConnector class.
     */
    constructor() {
        this.headers = {};
    }

    private initPromises: Promise<void>[] = [];

    initialized() {
        return Promise.all(this.initPromises);
    }

    /**
     * Method that sets application configuration. Must be called before making any requests.
     */
    initConfiguration(app: IApp): this {
        this.appConfig = app.config;
        this.openapi = app.schema;
        this.defaultVersion = this.openapi.info.version;
        this.endpointURL = String(new URL(app.config.api.endpointPath, app.config.api.url)); // TODO fetchMock does not support URL
        this.baseURL = new URL(app.config.api.url).toString().replace(/\/$/, '');
        this.bulk = createBulkApiFetch({ config: this.appConfig });

        this.fetch = createApiFetch({ config: app.config });
        this.disableBulk = app.config.api.disableBulk;

        return this;
    }

    async makeRequest<T = unknown>(
        req: MakeRequestParamsBulk | MakeRequestParamsFetch,
    ): Promise<APIResponse<T>>;
    async makeRequest(req: MakeRequestParamsFetchRaw): Promise<Response>;
    async makeRequest<T = unknown>(req: MakeRequestParams): Promise<APIResponse<T> | Response> {
        if (req.useBulk && !this.disableBulk) {
            const realBulk: BaseBulkRequest = {
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
            if (req.headers && Object.keys(req.headers).length > 0) {
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

            const response = await this.fetch(pathToSend, {
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

    async sendBulk<Responses = undefined>(requests: BaseBulkRequest[], type?: BulkType) {
        return this.bulk!.raw<Responses>(requests, { type, forceAuthRequired: true });
    }

    bulkQuery<T = Record<string, unknown>>(data: BaseBulkRequest): Promise<APIResponse<T>> {
        return this.bulk!<T>({ ...data, authRequired: true }).then((response) => {
            return new APIResponse(response);
        });
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
        return this.makeRequest<InnerData>({
            path: ['user', 'profile'],
            method: 'get',
            useBulk: true,
        }).then((response) => {
            return response.data;
        });
    }
}

export const apiConnector = new ApiConnector();
