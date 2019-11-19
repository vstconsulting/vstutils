/**
 * Object, that contains QuerySet classes.
 * QuerySet - class, that manages filtering/getting/updating/deleting of Model instances.
 */
let guiQuerySets = {};

/**
 * Base QuerySet class.
 */
guiQuerySets.QuerySet = class QuerySet {
    /**
     * Constructor of QuerySet class.
     * @param {object} model Model for which this QuerySet will be created.
     * @param {string} url Current url of view.
     * @param {object} query Object, that stores current QuerySet filters.
     */
    constructor(model, url, query = {}) {
        this.model = model;
        this.url = url;
        this.query = query;
        /**
         * Property, that means, loads prefetch data or not.
         */
        this.use_prefetch = false;
    }

    /**
     * Method, that converts 'this.query' object into 'filters' string,
     * appropriate for bulk query.
     * @param {object} query Object with pairs of key, value for QuerySet filters.
     */
    makeQueryString(query = this.query){
        let filters = [];
        for(let key in query){
            if(query.hasOwnProperty(key)) {
                filters.push([key, query[key]].join('='));
            }
        }
        return filters.join("&");
    }

    /**
     * Method, that converts 'this.url' string into 'data_type' array,
     * appropriate for bulk query.
     */
    getDataType(){
        return this.url.replace(/^\/|\/$/g, "").split("/");
    }

    /**
     * Method, that forms body of bulk query.
     * @param {string} method Method(get/delete/post/put/patch) of bulk query.
     * @param {object} data 'data' property for body of bulk query, data of Model instance.
     */
    formBulkQuery(method, data){
        let query = {
            method: method,
            data_type: this.getDataType(),
        };

        if(data) {
            query.data = data;
        }

        let filters = this.makeQueryString();

        if(filters.length > 0) {
            query.filters = filters;
        }

        return query;
    }

    /**
     * Method, that forms bulk query and send it to API.
     * @param {string} method Method(get/delete/post/put/patch) of bulk query.
     * @param {object} data 'data' property for body of bulk query, data of Model instance.
     */
    formQueryAndSend(method, data){
        return this.sendQuery(this.formBulkQuery(method, data));
    }

    /**
     * Method, that sends bulk query to API.
     * @param {object} bulk Object with properties of bulk data.
     */
    sendQuery(bulk){
        return app.api.bulkQuery(bulk);
    }

    /**
     * Method, that returns clone (new QuerySet instance) of current QuerySet.
     * @param {object} props Object with properties, that should be rewritten in clone.
     * @param {boolean} save_cache If true, cache of current QuerySet will be saved in clone.
     * @return {object} Clone - new QuerySet instance.
     */
    clone(props={}, save_cache=false) {
        let clone = $.extend(true, {}, this);
        /* jshint proto: true */
        clone.__proto__ = this.__proto__;

        for(let key in props) {
            if(props.hasOwnProperty(key)) {
                clone[key] = props[key];
            }
        }

        if(!save_cache) {
            clone.clearCache();
        }

        return clone;
    }

    /**
     * Method, that returns copy (new QuerySet instance) of current QuerySet,
     * with cache of current QuerySet.
     * @param {object} props Object with properties, that should be rewritten in copy instance.
     * @return {object} Copy - new QuerySet instance.
     */
    copy(props={}) {
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
     */
    filter(filters) {
        return this.clone({
            query: $.extend(true, {}, this.query, filters),
        });
    }

    /**
     * Method, that returns new QuerySet with new filters, that will be saved in 'query' property.
     * @param {object} filters Object with filters(key, value),
     * according to which some instances should be excluded from Model instances list.
     */
    exclude(filters) {
        let ecd_filters = {};
        for(let key in filters) {
            if(filters.hasOwnProperty(key)) {
                let ecd_key = key.indexOf("__not") == -1 ? key + "__not" : key;
                ecd_filters[ecd_key] = filters[key];
            }
        }
        return this.clone({query: $.extend(true, {}, this.query, ecd_filters)});
    }

    /**
     * Method, that returns new QuerySet with new value of 'use_prefetch' property.
     * @param {boolean, array} instances If boolean - means - Use prefetch or not,
     * otherwise, means array with names of model fields,
     * that should be used as prefetch field.
     */
    prefetch(instances=true) {
        let qs = this.clone();

        if(instances) {
            qs.use_prefetch = instances;
        } else {
            qs.use_prefetch = false;
        }

        return qs;
    }

    /**
     * Method, that sends to API get request for getting list of Model instances,
     * appropriate for filters from 'this.query' property.
     * Method, returns promise, that returns list of Model instances,
     * if api request was successful.
     */
    items() {
        if(this.cache){
            return Promise.resolve(this.cache);
        }
        return this.formQueryAndSend('get').then(response => {
            let instances = [];
            let data = response.data.results;
            let prefetch_fields = this._getPrefetchFields();

            for(let index = 0; index < data.length; index++){
                instances.push(
                    this.model.getInstance(data[index], this.clone())
                );
            }

            // if prefetch fields exist, loads prefetch data.
            if(prefetch_fields && prefetch_fields.length > 0) {
                return this._loadPrefetchData(prefetch_fields, instances).then(() => {
                    this.api_count = response.data.count;
                    this.cache = instances;
                    return instances;
                });
            }

            // otherwise returns instances.
            this.api_count = response.data.count;
            this.cache = instances;
            return instances;
        }).catch(error => {
            debugger;
            throw error;
        });
    }

    /**
     * Method, that sends query to API for creation of new Model instance
     * and returns promise, that returns Model instance, if query response was successful.
     * @param {object} data Data of new Model instance.
     */
    create(data) {
        return this.formQueryAndSend('post', data).then(response => {
            return this.model.getInstance(response.data, this.clone());
        }).catch(error => {
            debugger;
            throw error;
        });
    }


    /**
     * Method, that deletes all Model instances, that this.items() returns.
     * It means, that this method deletes all instances, that were filtered before it's execution.
     * This method is expected to be called after instance filtering.
     * This method is only for querysets, that have 'url' of 'list' type.
     * This method should not be applied for querysets with 'page' type url.
     */
    delete() {
        this.items().then(instances => {
            instances.forEach(instance => {
                instance.delete();
            });
        }).catch(error => {
            debugger;
            throw error;
        });
    }

    /**
     * Method, that returns promise, that returns Model instance with 'this.url' URI,
     * if api query was successful.
     */
    get() {
        if(this.cache) {
            return Promise.resolve(this.cache);
        }
        return this.formQueryAndSend('get').then(response => {
            let instance = this.model.getInstance(response.data, this);
            let prefetch_fields = this._getPrefetchFields();

            // if prefetch fields exist, loads prefetch data.
            if(prefetch_fields && prefetch_fields.length > 0) {
                return this._loadPrefetchData(prefetch_fields, [instance]).then(() => {
                    this.cache = instance;
                    return instance;
                });
            }

            // otherwise, returns instance.
            this.cache = instance;
            return instance;
        }).catch(error => {
            debugger;
            throw error;
        });
    }

    /**
     * Method, that cleans QuerySet cache.
     */
    clearCache() {
        delete this.cache;
        delete this.api_count;
    }

    /**
     * Method, that returns array with names of prefetch fields.
     */
    _getPrefetchFields() {
        if(Array.isArray(this.use_prefetch)) {
            return this.use_prefetch;
        } else if(this.use_prefetch) {
            return this.model.getPrefetchFields();
        }
    }

    /**
     * Method, that forms bulk_data for prefetch Bulk.
     * @param {array} prefetch_fields Array with names of prefetch fields.
     * @param {object} instances Object with loaded model instances.
     * @private
     */
    _getBulkDataForPrefetch(prefetch_fields, instances) {
        let bulk_data = {};

        for(let index = 0; index < instances.length; index++) {
            let instance = instances[index];

            this._getBulkDataForPrefetchForInstance(prefetch_fields, instance, bulk_data);
        }

        return bulk_data;
    }

    /**
     * Method, that forms prefetch bulk_data for one instance.
     * @param {array} prefetch_fields Array with names of prefetch fields.
     * @param {object} instance Model instance.
     * @param {object} bulk_data Object with bulk_data.
     * @private
     */
    _getBulkDataForPrefetchForInstance(prefetch_fields, instance, bulk_data) {
        for(let key in prefetch_fields) {
            if(prefetch_fields.hasOwnProperty(key)) {
                let field_name = prefetch_fields[key];
                let field = this.model.fields[field_name];
                let value = instance.data[field_name];

                if (value == null || value == undefined) {
                    continue;
                }

                if (!field.prefetchDataOrNot(instance.data)) {
                    continue;
                }

                let obj = field.getObjectBulk(instance.data, this.url);

                if (obj == undefined || typeof obj == 'string') {
                    continue;
                }

                if (!bulk_data[field_name]) {
                    bulk_data[field_name] = [];
                }

                let pushed = false;

                for (let item in bulk_data[field_name]) {
                    if (deepEqual(bulk_data[field_name][item].data_type, obj.data_type)) {
                        if (!bulk_data[field_name][item].filter_values.includes(obj.id)) {
                            bulk_data[field_name][item].filter_values.push(obj.id);
                        }
                        if (!bulk_data[field_name][item].instances_ids.includes(instance.getPkValue())) {
                            bulk_data[field_name][item].instances_ids.push(instance.getPkValue());
                        }

                        pushed = true;
                    }
                }

                if (!pushed) {
                    bulk_data[field_name].push({
                        instances_ids: [instance.getPkValue()],
                        data_type: obj.data_type,
                        filter_name: field.options.additionalProperties.value_field,
                        filter_values: [obj.id],
                    });
                }
            }
        }

        return bulk_data;
    }

    /**
     * Method, that loads prefetch info for instances,
     * which were loaded by current queryset.
     * @param {array} prefetch_fields Array with names of prefetch fields.
     * @param {object} instances Object with loaded model instances.
     * @private
     */
    _loadPrefetchData(prefetch_fields, instances) {
        let promises = [];
        let bulk_data = this._getBulkDataForPrefetch(prefetch_fields, instances);

        for(let key in bulk_data) {
            if(bulk_data.hasOwnProperty(key)) {
                for (let index = 0; index < bulk_data[key].length; index++) {
                    let item = bulk_data[key][index];
                    let filters = {};

                    filters[item.filter_name] = item.filter_values;

                    let bulk = {
                        method: 'get',
                        data_type: item.data_type,
                        filters: this.makeQueryString(filters),
                    };

                    promises.push(
                        this.sendQuery(bulk).then(res => {
                            this._setPrefetchValue(res, item, instances, key);
                        }).catch(error => { /* jshint unused: false */
                            debugger;
                        })
                    );
                }
            }
        }

        return Promise.all(promises);
    }

    /**
     * Method, that adds loaded prefetch data to instances.
     * @param {object} res Prefetch API response.
     * @param {object} bulk_data_item Object bulk data for prefetch request.
     * @param {array} instances Array with instances.
     * @param {string} field_name Name of model field.
     * @private
     */
    _setPrefetchValue(res, bulk_data_item, instances, field_name) { /* jshint unused: false */
        if(res.status != "200") {
            return;
        }

        let prefetch_data = res.data.results;
        let props = this.model.fields[field_name].options.additionalProperties;
        let view_field = props.view_field;
        let value_field = props.value_field;

        for(let index = 0; index < instances.length; index++) {
            let instance = instances[index];

            if(!bulk_data_item.instances_ids.includes(instance.getPkValue())) {
                continue;
            }

            for(let j in prefetch_data) {
                if(prefetch_data[j][value_field] == instance.data[field_name]) {

                    instance.data[field_name] = {
                        value: instance.data[field_name],
                        prefetch_value: prefetch_data[j][view_field],
                    };
                }
            }
        }
    }
};