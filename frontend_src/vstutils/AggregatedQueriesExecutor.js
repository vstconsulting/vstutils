import { NotFoundError } from './querySet/errors.js';

export class AggregatedQueriesExecutor {
    /**
     * @param {QuerySet} queryset
     * @param {string} filterName
     * @param {string} filterFieldName
     */
    constructor(queryset, filterName, filterFieldName = filterName) {
        this.queryset = queryset;
        this.filterName = filterName;
        this.filterFieldName = filterFieldName;
        /** @type {Map<string|number, Array.<{resolve: Function, reject: Function}>>} */
        this._queries = new Map();
    }

    /**
     * @param {string|number} filterFieldValue
     * @return {Promise<Model>}
     */
    query(filterFieldValue) {
        let callbacks;
        const promise = new Promise((resolve, reject) => (callbacks = { resolve, reject }));

        if (!this._queries.has(filterFieldValue)) {
            this._queries.set(filterFieldValue, []);
        }
        this._queries.get(filterFieldValue).push(callbacks);
        return promise;
    }

    /**
     * Method that sends aggregated query
     * @return {Promise<void>}
     */
    async execute() {
        if (this._queries.size === 0) return;

        const queries = this._queries;
        this._queries = new Map();

        const values = Array.from(queries.keys());
        const qs = this.queryset.filter({ [this.filterName]: values.join(','), limit: values.length });

        let instances;
        try {
            instances = await qs.items();
        } catch (e) {
            for (const promises of queries.values()) {
                for (const promise of promises) promise.reject(e);
            }
            throw e;
        }

        // Resolve promises for found instances
        for (const instance of instances) {
            const filterFieldValue = instance._data[this.filterFieldName];
            if (!queries.has(filterFieldValue)) {
                continue;
            }
            for (const promise of queries.get(filterFieldValue)) {
                promise.resolve(instance);
            }
            queries.delete(filterFieldValue);
        }

        // Reject promises if instance not found
        for (const [pk, promises] of queries) {
            for (const promise of promises) {
                promise.reject(new NotFoundError(pk, this.queryset));
            }
        }
    }
}
