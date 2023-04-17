import $ from 'jquery';

import { apiConnector, APIResponse, StatusError } from '@/vstutils/api';
import { createInstancesList } from '@/vstutils/models';
import { BulkType, HttpMethods, makeQueryString, objectToFormData, RequestTypes } from '@/vstutils/utils';

import type { RequestType, HttpMethod, InnerData, RepresentData } from '@/vstutils/utils';
import type { InstancesList, Model, ModelConstructor } from '@/vstutils/models';
import type { Field } from '@/vstutils/fields/base';
import type { ListResponseData } from './types';
import { fetchInstances } from '@/vstutils/fetch-values';
import { readonly } from 'vue';

const REQUEST_MODEL = 0;
const RESPONSE_MODEL = 1;

type ModelType = typeof REQUEST_MODEL | typeof RESPONSE_MODEL;

/**
 * Error that will be thrown if given instance has not appropriate model.
 */
export class WrongModelError extends Error {
    constructor(expectedModel: ModelConstructor, actualInstance: Model) {
        super(`Wrong model used. Expected: ${expectedModel.name}. Actual: ${actualInstance._name}.`);
    }

    static checkModel(model: ModelConstructor, instance: Model) {
        if (!(instance instanceof model)) {
            throw new WrongModelError(model, instance);
        }
    }
}

const NOT_PUT_IN_EXTRA = ['results'];

type ModelsConfiguration = Record<
    RequestType,
    ModelConstructor | [ModelConstructor, ModelConstructor] | undefined
>;

export class QuerySet {
    _url: string | null;
    pattern: string;
    models: ModelsConfiguration;

    pathParams: Field[];
    pathParamsValues: Record<string, unknown>;

    query: Record<string, unknown>;

    cache: unknown;

    listSubscriptionLabels: string[];
    prefetchEnabled: boolean;

    constructor(
        pattern: string,
        models: ModelsConfiguration,
        query: Record<string, unknown> = {},
        pathParams: Field[] = [],
    ) {
        this._url = null;
        this.pattern = pattern;
        this.pathParams = pathParams;
        this.pathParamsValues = {};

        this.models = models;
        this.query = query;

        this.cache = undefined;

        this.listSubscriptionLabels = [];

        this.prefetchEnabled = true;
    }

    get url() {
        if (this._url) {
            return this._url;
        }
        let url = this.pattern;
        for (const param of this.pathParams) {
            const value = param.toInner(this.pathParamsValues as RepresentData);
            if (value !== undefined && value !== null) {
                url = url.replace(
                    `{${param.name}}`,
                    param.toInner(this.pathParamsValues as RepresentData) as string,
                );
            }
        }
        return url;
    }

    set url(url) {
        if (url.includes('{')) {
            this.pattern = url;
            this._url = null;
        } else {
            this._url = url;
        }
    }

    formatPath(pathParamsValues: Record<string, unknown>) {
        return this.clone({ pathParamsValues });
    }

    /**
     * Method that returns proper model for specified operation. If custom operation type
     * used and model for that type exists in configuration it will be returned.
     * If no appropriate model found, than null is returned.
     *
     * Order used to determine model class:
     * `PARTIAL_UPDATE` / `UPDATE` -> `CREATE` -> `RETRIEVE` -> `LIST`
     */
    getModelClass(operation: RequestType, modelType: ModelType = RESPONSE_MODEL): ModelConstructor | null {
        const models = this.models[operation];

        if (models) {
            if (Array.isArray(models)) {
                return models[modelType];
            }
            return models;
        }

        switch (operation) {
            case RequestTypes.PARTIAL_UPDATE:
                return this.getModelClass(RequestTypes.CREATE, modelType);
            case RequestTypes.UPDATE:
                return this.getModelClass(RequestTypes.CREATE, modelType);
            case RequestTypes.CREATE:
                return this.getModelClass(RequestTypes.RETRIEVE, modelType);
            case RequestTypes.RETRIEVE:
                return this.getModelClass(RequestTypes.LIST, modelType);
        }

        return null;
    }

    /**
     * Method that returns request model for given operation.
     * Throws error if no model found.
     */
    getRequestModelClass(operation: RequestType): ModelConstructor {
        const model = this.getModelClass(operation, REQUEST_MODEL);
        if (!model) {
            throw new Error(`No request model for operation ${operation} on path ${this.url}`);
        }
        return model;
    }

    /**
     * Method that returns response model for given operation.
     * Throws error if no model found.
     */
    getResponseModelClass(operation: RequestType): ModelConstructor {
        const model = this.getModelClass(operation, RESPONSE_MODEL);
        if (!model) {
            throw new Error(`No response model for operation ${operation} on path ${this.url}`);
        }
        return model;
    }

    /**
     * Getter that returns queryset urls as string array
     */
    getDataType() {
        return this.url.replace(/^\/|\/$/g, '').split('/');
    }

    /**
     * Method, that returns clone (new QuerySet instance) of current QuerySet.
     * @param props Object with properties, that should be rewritten in clone.
     * @param save_cache If true, cache of current QuerySet will be saved in clone.
     */
    clone(props: Partial<{ [K in keyof QuerySet]: QuerySet[K] }> = {}, save_cache = false): QuerySet {
        const clone = Object.create(Object.getPrototypeOf(this) as object) as QuerySet;

        $.extend(true, clone, this);
        Object.assign(clone, props);

        if (!save_cache) clone.clearCache();

        return Object.freeze(
            // Vue 2 internally makes object readonly, this will fail for freezed
            // object, so we need to make it readonly before freezing
            // TODO: Remove in Vue 3
            readonly(clone) as QuerySet,
        );
    }

    /**
     * Method, that returns copy (new QuerySet instance) of current QuerySet,
     * with cache of current QuerySet.
     * @param props Object with properties, that should be rewritten in copy instance.
     */
    copy(props = {}) {
        return this.clone(props, true);
    }

    /**
     * Method, that returns new QuerySet with current value of 'this.query' property.
     */
    all() {
        return this.clone();
    }

    /**
     * Method, that returns new QuerySet with new filters, that will be saved in 'query' property.
     * @param {object} filters Object with filters(key, value),
     * according to which Model instances list should be sorted.
     * @return {QuerySet}
     */
    filter(filters: Record<string, unknown>) {
        return this.clone({ query: $.extend(true, {}, this.query, filters) });
    }

    /**
     * Method, that returns new QuerySet with new filters, that will be saved in 'query' property.
     * @param {object} filters Object with filters(key, value),
     * according to which some instances should be excluded from Model instances list.
     */
    exclude(filters: Record<string, unknown>) {
        const ecd_filters: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(filters)) {
            const ecd_key = !key.includes('__not') ? key + '__not' : key;
            ecd_filters[ecd_key] = value;
        }
        return this.clone({ query: $.extend(true, {}, this.query, ecd_filters) });
    }

    _getDetailPath(id: string | number) {
        return [...this.getDataType(), id];
    }

    async get(
        id: string | number | undefined,
        pathParamsValues: Record<string, unknown> | null = null,
    ): Promise<Model> {
        if (pathParamsValues) {
            return this.clone({ pathParamsValues }).get(id);
        }
        const model = this.getResponseModelClass(RequestTypes.RETRIEVE);

        let instance;
        if (id === undefined) {
            instance = await this.getOne();
        } else {
            const response = await this.execute<InnerData>({
                method: HttpMethods.GET,
                path: this._getDetailPath(id),
                query: this.query,
                useBulk: model.shouldUseBulk(HttpMethods.GET),
            });
            instance = new model(response.data, this);
            instance._response = response;
        }

        if (this.prefetchEnabled) {
            await fetchInstances([instance], { isPrefetch: true });
        }

        return instance;
    }

    /**
     * Method returns one instance, if more than one instance found error is thrown
     */
    async getOne(pathParamsValues?: Record<string, unknown>): Promise<Model> {
        if (pathParamsValues) {
            return this.clone({ pathParamsValues }).getOne();
        }
        const retrieveModel = this.getResponseModelClass(RequestTypes.RETRIEVE);
        const listModelSameAsRetrieve = retrieveModel === this.getResponseModelClass(RequestTypes.LIST);
        const useBulk = retrieveModel.shouldUseBulk(HttpMethods.GET);

        if (useBulk && !listModelSameAsRetrieve) {
            const pkFieldName = retrieveModel.pkField!.name;
            const path = this.getDataType();
            const results = await apiConnector.sendBulk<[ListResponseData, InnerData]>([
                { method: HttpMethods.GET, path, query: makeQueryString({ ...this.query, limit: 1 }, true) },
                { method: HttpMethods.GET, path: [...path, `<<0[data][results][0][${pkFieldName}]>>`] },
            ]);
            if (results[0].data.count > 1) {
                throw new Error('More then one entity found');
            } else if (results[0].data.count === 0) {
                APIResponse.throwStatusError(404, {
                    detail: `No ${retrieveModel.name} matches the given query.`,
                });
            }
            const instance = new retrieveModel(results[1].data, this);

            if (this.prefetchEnabled) {
                await fetchInstances([instance], { isPrefetch: true });
            }

            return instance;
        } else {
            const items = await this.filter({ limit: 1 }).items();
            if (items.extra?.count && items.extra.count > 1) {
                throw new Error('More then one entity found');
            }
            if (!items.length) {
                throw new StatusError(404, 'Not Found');
            }
            if (listModelSameAsRetrieve) {
                return items[0];
            }
            return this.get(items[0].getPkValue()!);
        }
    }

    /**
     * Method, that sends to API get request for getting list of Model instances,
     * appropriate for filters from 'this.query' property.
     * Method, returns promise, that returns list of Model instances,
     * if api request was successful.
     */
    async items(invalidateCache = true, pathParamsValues?: Record<string, unknown>): Promise<InstancesList> {
        if (pathParamsValues) {
            return this.clone({ pathParamsValues }).items(invalidateCache);
        }
        if (!invalidateCache && this.cache) return this.cache as InstancesList;

        const model = this.getResponseModelClass(RequestTypes.LIST);

        const response = await this.execute<ListResponseData<InnerData>>({
            method: HttpMethods.GET,
            path: this.getDataType(),
            query: this.query,
            useBulk: model.shouldUseBulk(HttpMethods.GET),
        });

        const instances = createInstancesList(
            response.data.results.map((item) => new model(item, this.clone())),
        );

        for (const key of Object.keys(response.data)) {
            if (!NOT_PUT_IN_EXTRA.includes(key)) {
                instances.extra[key] = response.data[key];
            }
        }
        instances.total = instances.extra.count;

        if (this.prefetchEnabled) {
            await fetchInstances(instances, { isPrefetch: true });
        }

        return instances;
    }

    _getCreateBulkPath(pkFieldName: string) {
        return [...this.getDataType(), `<<0[data][${pkFieldName}]>>`];
    }

    /**
     * Method, that sends query to API for creation of new Model instance
     * and returns promise, that returns Model instance, if query response was successful.
     */
    async create(instance: Model, method: HttpMethod = HttpMethods.POST) {
        const createModel = this.getRequestModelClass(RequestTypes.CREATE);
        WrongModelError.checkModel(createModel, instance);
        const retrieveModel = this.getResponseModelClass(RequestTypes.RETRIEVE);
        const createModelSameAsRetrieve = createModel === this.getResponseModelClass(RequestTypes.RETRIEVE);
        const dataType = this.getDataType();

        if (
            !createModelSameAsRetrieve &&
            createModel.shouldUseBulk(method) &&
            retrieveModel.shouldUseBulk(HttpMethods.GET)
        ) {
            const pkFieldName = retrieveModel.pkField!.name;
            const results = await apiConnector.sendBulk<[Record<string, unknown>, InnerData]>([
                { method, path: dataType, data: instance._getInnerData() },
                { method: HttpMethods.GET, path: this._getCreateBulkPath(pkFieldName) },
            ]);
            APIResponse.checkStatus(results[0].status, results[0].data);
            return new retrieveModel(results[1].data, this);
        } else {
            const response = await this.execute<InnerData>({
                method,
                data: instance,
                path: dataType,
                query: this.query,
                useBulk: createModel.shouldUseBulk(method),
            });
            const createdInstance = new createModel(response.data, this);
            if (createModelSameAsRetrieve) {
                return createdInstance;
            }
            return this.get(createdInstance.getPkValue()!);
        }
    }

    /**
     * Method, that sends api request for model update
     */
    async update(
        updatedInstance: Model,
        instances?: Model[],
        method: HttpMethod = HttpMethods.PATCH,
        fields?: string[],
    ) {
        if (instances === undefined) instances = await this.items();

        const requestType = method === HttpMethods.PATCH ? RequestTypes.PARTIAL_UPDATE : RequestTypes.UPDATE;
        const modelUpdate = this.getRequestModelClass(requestType);
        const modelRetrieve = this.getResponseModelClass(RequestTypes.RETRIEVE);

        WrongModelError.checkModel(modelUpdate, updatedInstance);

        const updateModelSameAsRetrieve = modelUpdate === modelRetrieve;

        const data = updatedInstance._getInnerData(fields);

        if (
            !updateModelSameAsRetrieve &&
            modelUpdate.shouldUseBulk(method) &&
            modelRetrieve.shouldUseBulk(HttpMethods.GET)
        ) {
            const requests = instances.flatMap((instance) => {
                const path = this._getDetailPath(instance.getPkValue()!);
                return [
                    { method, path, data },
                    { method: HttpMethods.GET, path },
                ];
            });

            return (await apiConnector.sendBulk(requests, BulkType.TRANSACTIONAL))
                .map((response) => new APIResponse(response))
                .filter((_, idx) => idx % 2 !== 0)
                .map((response) => new modelRetrieve(response.data as InnerData, this));
        } else {
            return Promise.all(
                instances.map(async (instance) => {
                    const response = await this.execute<InnerData>({
                        method,
                        data,
                        path: this._getDetailPath(instance.getPkValue()!),
                        query: this.query,
                        useBulk: modelUpdate.shouldUseBulk(method),
                    });
                    return new modelUpdate(response.data, this);
                }),
            );
        }
    }

    /**
     * Method, that deletes provided instances or all instances that match current queryset items().
     * This method is expected to be called after instance filtering.
     */
    async delete(instances?: Model[], purge = false) {
        if (instances === undefined) instances = await this.items();

        const retrieveModel = this.getModelClass(RequestTypes.RETRIEVE, RESPONSE_MODEL);
        const useBulk = retrieveModel ? retrieveModel.shouldUseBulk(HttpMethods.DELETE) : true;

        const headers: Record<string, unknown> = {};
        if (purge) {
            headers.HTTP_X_Purge_Nested = String(purge);
        }

        return Promise.all(
            instances.map((instance) => {
                return this.execute({
                    method: HttpMethods.DELETE,
                    path: this._getDetailPath(instance.getPkValue()!),
                    headers,
                    useBulk,
                });
            }),
        );
    }

    /**
     * Function that checks if given object is instance of Model
     */
    _isModelInstance(obj?: object): obj is Model {
        return Boolean(obj && '_getInnerData' in obj && typeof obj._getInnerData === 'function');
    }

    /**
     * Method, that sends API request to ApiConnector.
     */
    async execute<T>(req: InternalRequest) {
        const data = req.data;
        const dataIsModel = this._isModelInstance(data);

        const preparedReq: Parameters<typeof apiConnector.makeRequest>[0] = {
            useBulk: req.useBulk ?? (dataIsModel ? data.shouldUseBulk(req.method) : true),
            method: req.method,
            path: req.path,
            query: req.query,
            headers: req.headers,
            version: req.version,
        };

        if (data !== undefined) {
            const rawData = dataIsModel ? data._getInnerData() : data;
            if (preparedReq.useBulk) {
                preparedReq.data = rawData;
            } else {
                preparedReq.data = objectToFormData(rawData);
            }
        }
        return apiConnector.makeRequest<T>(preparedReq);
    }

    /**
     * Method, that cleans QuerySet cache.
     */
    clearCache() {
        this.cache = undefined;
    }
}

interface InternalRequest {
    method: HttpMethod;
    path: string | (string | number)[];
    query?: string | Record<string, unknown> | URLSearchParams;
    data?: Model | Record<string, unknown>;
    headers?: Record<string, unknown>;
    useBulk?: boolean;
    version?: string;
}

export default QuerySet;
