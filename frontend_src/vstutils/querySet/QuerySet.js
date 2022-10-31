import $ from 'jquery';
import { BulkType, HttpMethods, makeQueryString, objectToFormData, RequestTypes } from '../utils';
import { StatusError, apiConnector, APIResponse } from '../api';

/**
 * Error that will be thrown if given instance has not appropriate model.
 */
export class WrongModelError extends Error {
    constructor(expectedModel, actualInstance) {
        super(`Wrong model used. Expected: ${expectedModel.name}. Actual: ${actualInstance._name}.`);
    }

    static checkModel(model, instance) {
        if (!(instance instanceof model)) {
            throw new WrongModelError(model, instance);
        }
    }
}

const NOT_PUT_IN_EXTRA = ['results'];

/**
 * @typedef {Object.<RequestType, (Function|Function[])>} ModelsConfiguration
 */

/**
 * Base QuerySet class.
 */
export default class QuerySet {
    /**
     * @param {string} pattern - Must be without leading and ending slashes
     * @param {ModelsConfiguration} models - Models classes
     * @param {Object} query - Object with query parameters
     * @param {Array<BaseField>} pathParams - Object that describes path parameters
     */
    constructor(pattern, models, query = {}, pathParams = []) {
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
            let value = param.toInner(this.pathParamsValues);
            if (value !== undefined && value !== null) {
                url = url.replace(`{${param.name}}`, param.toInner(this.pathParamsValues));
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

    formatPath(pathParamsValues) {
        return this.clone({ pathParamsValues });
    }

    /**
     * Method that returns proper model for specified operation. If custom operation type
     * used and model for that type exists in configuration it will be returned.
     * If no appropriate model found, than null is returned.
     *
     * Order used to determine model class:
     * `PARTIAL_UPDATE` / `UPDATE` -> `CREATE` -> `RETRIEVE` -> `LIST`
     *
     * @param {RequestType} operation
     * @param {number} modelType - 0 for request and 1 for response
     * @return {typeof Model|null}
     */
    getModelClass(operation, modelType = 1) {
        if (this.models[operation]) {
            if (Array.isArray(this.models[operation])) {
                return this.models[operation][modelType];
            }
            return this.models[operation];
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
     * Method that returns request model for given operation
     * @param {RequestType} operation
     * @return {Function|null}
     */
    getRequestModelClass(operation) {
        return this.getModelClass(operation, 0);
    }

    /**
     * Method that returns response model for given operation
     * @param {RequestType} operation
     * @return {typeof Model|null}
     */
    getResponseModelClass(operation) {
        return this.getModelClass(operation, 1);
    }

    /**
     * Getter that returns queryset urls as string array
     * @return {string[]}
     */
    getDataType() {
        return this.url.replace(/^\/|\/$/g, '').split('/');
    }

    /**
     * Method, that returns clone (new QuerySet instance) of current QuerySet.
     * @param {object} props Object with properties, that should be rewritten in clone.
     * @param {boolean} save_cache If true, cache of current QuerySet will be saved in clone.
     * @return {QuerySet} Clone - new QuerySet instance.
     */
    clone(props = {}, save_cache = false) {
        const clone = Object.create(Object.getPrototypeOf(this));

        $.extend(true, clone, this);
        Object.assign(clone, props);

        if (!save_cache) clone.clearCache();

        return Object.freeze(clone);
    }

    /**
     * Method, that returns copy (new QuerySet instance) of current QuerySet,
     * with cache of current QuerySet.
     * @param {object} props Object with properties, that should be rewritten in copy instance.
     * @return {object} Copy - new QuerySet instance.
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
    filter(filters) {
        return this.clone({ query: $.extend(true, {}, this.query, filters) });
    }

    /**
     * Method, that returns new QuerySet with new filters, that will be saved in 'query' property.
     * @param {object} filters Object with filters(key, value),
     * according to which some instances should be excluded from Model instances list.
     */
    exclude(filters) {
        let ecd_filters = {};
        for (let [key, value] of Object.entries(filters)) {
            let ecd_key = key.indexOf('__not') === -1 ? key + '__not' : key;
            ecd_filters[ecd_key] = value;
        }
        return this.clone({ query: $.extend(true, {}, this.query, ecd_filters) });
    }

    _getDetailPath(id) {
        return [...this.getDataType(), id];
    }

    /**
     * Method, that returns promise with Model instance.
     * @param {string | number} id?
     * @return {Promise.<Model>}
     */
    async get(id, pathParamsValues = null) {
        if (pathParamsValues) {
            return this.clone({ pathParamsValues }).get(id);
        }
        const model = this.getResponseModelClass(RequestTypes.RETRIEVE);

        let instance;
        if (id === undefined) {
            instance = await this.getOne();
        } else {
            const response = await this.execute({
                method: HttpMethods.GET,
                path: this._getDetailPath(id),
                query: this.query,
                useBulk: model.shouldUseBulk(HttpMethods.GET),
            });
            instance = new model(response.data, this);
        }

        await this._executeAfterInstancesFetchedHooks([instance], model);

        return instance;
    }

    /**
     * Method returns one instance, if more than one instance found error is thrown
     * @return {Promise<Model>}
     */
    async getOne(pathParamsValues = null) {
        if (pathParamsValues) {
            return this.clone({ pathParamsValues }).getOne();
        }
        const retrieveModel = this.getResponseModelClass(RequestTypes.RETRIEVE);
        const listModelSameAsRetrieve = retrieveModel === this.getResponseModelClass(RequestTypes.LIST);
        const useBulk = retrieveModel.shouldUseBulk(HttpMethods.GET);

        if (useBulk && !listModelSameAsRetrieve) {
            const pkFieldName = retrieveModel.pkField.name;
            const path = this.getDataType();
            const results = await apiConnector.sendBulk([
                { method: HttpMethods.GET, path, query: makeQueryString({ ...this.query, limit: 1 }, true) },
                { method: HttpMethods.GET, path: [...path, `<<0[data][results][0][${pkFieldName}]>>`] },
            ]);
            if (results[0].data.count > 1) {
                throw new Error('More then one entity found');
            } else if (results[0].data.count === 0) {
                return new APIResponse(404, { detail: `No ${retrieveModel.name} matches the given query.` });
            }
            const instance = new retrieveModel(results[1].data, this);

            await this._executeAfterInstancesFetchedHooks([instance], retrieveModel);

            return instance;
        } else {
            const items = await this.filter({ limit: 1 }).items();
            if (items.extra.count > 1) {
                throw new Error('More then one entity found');
            }
            if (!items.length) {
                throw new StatusError(404, 'Not Found');
            }
            if (listModelSameAsRetrieve) {
                return items[0];
            }
            return this.get(items[0].getPkValue());
        }
    }

    /**
     * Method, that sends to API get request for getting list of Model instances,
     * appropriate for filters from 'this.query' property.
     * Method, returns promise, that returns list of Model instances,
     * if api request was successful.
     *
     * @returns {Promise<Model[]>}
     */
    async items(invalidateCache = true, pathParamsValues = null) {
        if (pathParamsValues) {
            return this.clone({ pathParamsValues }).items(invalidateCache);
        }
        if (!invalidateCache && this.cache) return this.cache;

        const model = this.getResponseModelClass(RequestTypes.LIST);

        const response = await this.execute({
            method: HttpMethods.GET,
            path: this.getDataType(),
            query: this.query,
            useBulk: model.shouldUseBulk(HttpMethods.GET),
        });

        const instances = response.data.results.map((item) => new model(item, this.clone()));

        await this._executeAfterInstancesFetchedHooks(instances, model);

        instances.extra = {};
        for (let key of Object.keys(response.data)) {
            if (!NOT_PUT_IN_EXTRA.includes(key)) {
                instances.extra[key] = response.data[key];
            }
        }

        instances.total = response.data.count;
        return instances;
    }

    _executeAfterInstancesFetchedHooks(instances, model) {
        const fields = Array.from(model.fields.values());

        // Execute fields hooks
        return Promise.all(fields.map((field) => field.afterInstancesFetched(instances, this)));
    }

    _getCreateBulkPath(pkFieldName) {
        return [...this.getDataType(), `<<0[data][${pkFieldName}]>>`];
    }

    /**
     * Method, that sends query to API for creation of new Model instance
     * and returns promise, that returns Model instance, if query response was successful.
     *
     * @param {Model} instance - new model data.
     * @param {string} method - Http method.
     * @returns {Promise.<Model>}
     */
    async create(instance, method = HttpMethods.POST) {
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
            const pkFieldName = retrieveModel.pkField.name;
            const results = await apiConnector.sendBulk([
                { method, path: dataType, data: instance._getInnerData() },
                { method: HttpMethods.GET, path: this._getCreateBulkPath(pkFieldName) },
            ]);
            APIResponse.checkStatus(results[0].status, results[0].data);
            return new retrieveModel(results[1].data, this);
        } else {
            const response = await this.execute({
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
            return this.get(createdInstance.getPkValue());
        }
    }

    /**
     * Method, that sends api request for model update
     *
     * @param {Model} updatedInstance
     * @param {Model[]} [instances] - Model instances to update.
     * @param {HttpMethod} [method] - Http method, PATCH by default.
     * @param {null | string[]} fields
     * @returns {Array.<Promise<Model>>}
     */
    async update(updatedInstance, instances, method = HttpMethods.PATCH, fields = null) {
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
                const path = this._getDetailPath(instance.getPkValue());
                return [
                    { method, path, data },
                    { method: HttpMethods.GET, path },
                ];
            });

            return (await apiConnector.sendBulk(requests, BulkType.TRANSACTIONAL))
                .map((response) => new APIResponse(response.status, response.data))
                .filter((_, idx) => idx % 2 !== 0)
                .map((response) => new modelRetrieve(response.data, this));
        } else {
            return Promise.all(
                instances.map(async (instance) => {
                    const response = await this.execute({
                        method,
                        data,
                        path: this._getDetailPath(instance.getPkValue()),
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
     *
     * @param {Model[]} instances
     * @param {boolean} purge
     * @returns {Promise}
     */
    async delete(instances = undefined, purge = false) {
        if (instances === undefined) instances = await this.items();

        const retrieveModel = this.getResponseModelClass(RequestTypes.RETRIEVE);
        const useBulk = retrieveModel ? retrieveModel.shouldUseBulk(HttpMethods.DELETE) : true;

        const headers = {};
        if (purge) {
            headers['HTTP_X_Purge_Nested'] = String(purge);
        }

        return Promise.all(
            instances.map((instance) => {
                return this.execute({
                    method: HttpMethods.DELETE,
                    path: this._getDetailPath(instance.getPkValue()),
                    headers,
                    useBulk,
                });
            }),
        );
    }

    /**
     * Function that checks if given object is instance of Model
     * @param {*} obj
     * @return {boolean}
     */
    _isModelInstance(obj) {
        return obj && typeof obj._getInnerData === 'function';
    }

    /**
     * Method, that sends API request to ApiConnector.
     *
     * @param {Object} req - Request parameters.
     * @param {string} req.method - Http method.
     * @param {string=} req.version - API version.
     * @param {(string|string[])} req.path
     * @param {(string|Object|URLSearchParams)=} req.query - URL query params.
     * @param {Model=} req.data
     * @param {(string|Object)=} req.headers
     * @param {boolean=} req.useBulk
     * @returns {Promise.<APIResponse>}
     */
    async execute(req) {
        const dataIsModel = this._isModelInstance(req.data);

        if (req.useBulk === undefined) {
            req.useBulk = dataIsModel ? req.data.constructor.shouldUseBulk(req.method) : true;
        }

        if (req.data !== undefined) {
            const rawData = dataIsModel ? req.data._getInnerData() : req.data;
            if (req.useBulk) {
                req.data = rawData;
            } else {
                req.data = objectToFormData(rawData);
            }
        }
        return apiConnector.makeRequest(req);
    }

    /**
     * Method, that cleans QuerySet cache.
     */
    clearCache() {
        this.cache = undefined;
    }
}
