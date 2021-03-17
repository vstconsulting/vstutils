import $ from 'jquery';
import StatusError from './StatusError.js';
import { guiLocalSettings, getCookie, makeQueryString, BulkType } from '../utils';

class APIResponse {
    constructor(status = undefined, data = undefined) {
        this.constructor.checkStatus(status, data);
        /**
         * @type {number}
         */
        this.status = status;
        /**
         * @type {Object}
         */
        this.data = data;
    }

    static checkStatus(status, data) {
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
function rejectAll(bulks, value) {
    for (const bulk of bulks) {
        bulk.callbacks.reject(value);
    }
}

/**
 * Represents one bulk request
 *
 * @typedef {Object} BulkRequest
 * @property {string} method - Http method.
 * @property {string} path - Request path.
 * @property {string} [version] - API version.
 * @property {any} [data] - Request data.
 * @property {Object} [query] - Query params.
 * @property {Object} [headers] - Request headers.
 */

/**
 * Represents one bulk response
 *
 * @typedef {Object} BulkResponse
 * @property {string} method - Http method.
 * @property {string} path - Request path.
 * @property {any} data - Returned data.
 * @property {number} status - Http status.
 */

/**
 * Class, that sends API requests.
 */
class ApiConnector {
    /**
     * Constructor of ApiConnector class.
     */
    constructor() {
        /**
         * @type {AppConfiguration}
         */
        this.appConfig = null;
        this.openapi = null;
        this.defaultVersion = null;
        this.endpointURL = null;

        /**
         * @typedef CollectedBulkRequest
         * @type {object}
         * @property {BulkRequest} data - Body of bulk query.
         * @property {Promise} promise - Promise for bulk request.
         * @property {{resolve: Function, reject: Function}} callbacks - Object with promise callbacks.
         */

        /**
         * Property for collecting several bulk requests into one.
         */
        this.bulk_collector = {
            /**
             * Timeout ID, that setTimeout() function returns.
             */
            timeout_id: undefined,
            /**
             * @type {CollectedBulkRequest[]}
             */
            bulk_parts: [],
        };

        this.headers = {
            'X-CSRFToken': getCookie('csrftoken'),
        };
    }

    /**
     * Method that sets application configuration. Must be called before making any requests.
     * @param {AppConfiguration} appConfig
     * @return {ApiConnector}
     */
    initConfiguration(appConfig) {
        this.appConfig = appConfig;
        this.openapi = appConfig.schema;
        this.defaultVersion = this.openapi.info.version;
        this.endpointURL = appConfig.endpointUrl;

        // remove version and ending slash from path (/api/v1/)
        const path = this.openapi.basePath.replace(this.defaultVersion, '').replace(/\/$/, '');
        this.baseURL = `${this.openapi.schemes[0]}://${this.openapi.host}${path}`;

        return this;
    }

    get cache() {
        return window.app.cache;
    }

    /**
     * Method, that sends API request.
     *
     * @param {Object} obj - Request parameters.
     * @param {string} obj.method - Http method.
     * @param {string=} obj.version - API version.
     * @param {(string|string[])} obj.path
     * @param {(string|Object|URLSearchParams)=} obj.query - URL query params.
     * @param {(string|FormData)=} obj.data
     * @param {(string|Object|URLSearchParams)=} obj.headers
     * @param {boolean} useBulk - Make request using bulk request.
     * @returns {Promise<APIResponse>}
     */
    async makeRequest({
        method,
        version = this.defaultVersion,
        path,
        query = undefined,
        data = undefined,
        headers = {},
        useBulk = false,
    }) {
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

            const fetchConfig = { method: method, headers: { ...this.headers, ...headers }, body: data };

            const response = await fetch(
                `${this.baseURL}/${version}/${pathStr}/${makeQueryString(query)}`,
                fetchConfig,
            );

            let json;
            try {
                json = await response.json();
                // eslint-disable-next-line no-empty
            } catch (e) {}

            return new APIResponse(response.status, json);
        }
    }

    /**
     * @param {BulkRequest[]} requests
     * @param {string} type - bulk type
     * @return {Promise.<BulkResponse[]>}
     */
    sendBulk(requests, type = BulkType.SIMPLE) {
        return fetch(this.endpointURL, {
            method: type,
            headers: { ...this.headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(requests),
        }).then((response) => response.json());
    }

    /**
     * Method, that collects several bulk requests into one.
     * @param {BulkRequest} data - Body of bulk request.
     * @returns {Promise.<BulkResponse>}
     */
    bulkQuery(data) {
        if (this.bulk_collector.timeout_id) {
            clearTimeout(this.bulk_collector.timeout_id);
        }

        const callbacks = {};
        const promise = new Promise((resolve, reject) => {
            callbacks.resolve = resolve;
            callbacks.reject = reject;
        });

        this.bulk_collector.bulk_parts.push({ data, promise, callbacks });

        this.bulk_collector.timeout_id = setTimeout(
            () => this._sendCollectedBulks(),
            guiLocalSettings.get('guiApi.real_query_timeout') || 100,
        );

        return promise;
    }

    /**
     * Method, that sends one big bulk request to API.
     * @return {Promise} Promise of getting bulk request response.
     */
    async _sendCollectedBulks() {
        const collector = $.extend(true, {}, this.bulk_collector);
        this.bulk_collector.bulk_parts = [];
        const bulk_data = collector.bulk_parts.map((bulkPart) => bulkPart.data);

        try {
            const results = await this.sendBulk(bulk_data);
            for (let [idx, item] of results.entries()) {
                try {
                    APIResponse.checkStatus(item.status, item.data);
                    collector.bulk_parts[idx].callbacks.resolve(item);
                } catch (e) {
                    collector.bulk_parts[idx].callbacks.reject(item);
                }
            }
        } catch (error) {
            rejectAll(collector.bulk_parts);
        }
    }
    /**
     * Method returns URL of API host (server).
     * @return {string}
     */
    getHostUrl() {
        return this.openapi.schemes[0] + '://' + this.openapi.host;
    }
    /**
     * Method returns string, containing time zone of API host.
     * @return {string}
     */
    getTimeZone() {
        return this.openapi.info['x-settings'].time_zone;
    }
    /**
     * Method returns relative path (from host url) to the directory with static path.
     * @return {string}
     */
    getStaticPath() {
        return this.openapi.info['x-settings'].static_path;
    }
    /**
     * Method returns id of user, that is now authorized and uses application.
     * @return {number | string}
     */
    getUserId() {
        return this.openapi.info['x-user-id'];
    }
    /**
     * Method, that loads data of authorized user.
     * @return {Promise} Promise of getting data of authorized user.
     */
    loadUser() {
        return this.bulkQuery({
            path: ['user', this.getUserId()],
            method: 'get',
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
