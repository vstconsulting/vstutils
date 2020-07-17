import $ from 'jquery';
import StatusError from './StatusError.js';
import { guiLocalSettings, getCookie } from '../utils';

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
         * Property for collecting several bulk requests into one.
         */
        this.bulk_collector = {
            /**
             * Timeout ID, that setTimeout() function returns.
             */
            timeout_id: undefined,
            /**
             * Array, that collects objects, created for every bulk request.
             * Example of this object.
             * {
             *   // Body of bulk query.
             *   data: {method: get, path: []},
             *
             *   // Promise for bulk request.
             *   promise: new Promise(),
             *
             *   // Object with promise callbacks.
             *   callbacks: {resolve: function(){}, reject: function(){},},
             * }
             */
            bulk_parts: [],
        };

        this.endpointURL = window.endpoint_url;

        this.headers = {
            'X-CSRFToken': getCookie('csrftoken'),
        };
    }

    get openapi() {
        return window.app.schema;
    }

    get cache() {
        return window.app.cache;
    }

    get defaultVersion() {
        return this.openapi.info.version;
    }

    get baseURL() {
        // remove version and ending slash from path (/api/v1/)
        const path = this.openapi.basePath.replace(this.defaultVersion, '').replace(/\/$/, '');

        return `${this.openapi.schemes[0]}://${this.openapi.host}${path}`;
    }

    /**
     * Method, that converts query object into string
     *
     * @param {(string|object|URLSearchParams)=} query
     * @param {boolean} useBulk - If false adds question mark (?) in front of string
     * @returns {string}
     */
    makeQueryString(query = undefined, useBulk = false) {
        let queryStr = '';
        if (typeof query === 'string') {
            queryStr = new URLSearchParams(query).toString();
        } else if (typeof query === 'object') {
            queryStr = new URLSearchParams(Object.entries(query)).toString();
        } else if (query instanceof URLSearchParams) {
            queryStr = query.toString();
        }

        if (!useBulk && queryStr !== '') queryStr = `?${queryStr}`;

        return queryStr;
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
        method = method,
        version = this.defaultVersion,
        path = path,
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
                query: this.makeQueryString(query, useBulk),
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
                `${this.baseURL}/${version}/${pathStr}/${this.makeQueryString(query)}`,
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
     * Method, that collects several bulk requests into one.
     * @param {object} data Body of bulk request.
     * @returns {Promise.<BulkResponse>}
     */
    bulkQuery(data) {
        if (this.bulk_collector.timeout_id) {
            clearTimeout(this.bulk_collector.timeout_id);
        }

        let callbacks = {
            resolve: undefined,
            reject: undefined,
        };

        let promise = new Promise((resolve, reject) => {
            callbacks.resolve = resolve;
            callbacks.reject = reject;
        });

        this.bulk_collector.bulk_parts.push({
            data: data,
            promise: promise,
            callbacks: callbacks,
        });

        let bulk_timeout = guiLocalSettings.get('guiApi.real_query_timeout') || 100;

        this.bulk_collector.timeout_id = setTimeout(() => this.sendBulk(), bulk_timeout);

        return promise;
    }
    /**
     * Method, that sends one big bulk request to API.
     * @return {Promise} Promise of getting bulk request response.
     */
    async sendBulk() {
        let collector = $.extend(true, {}, this.bulk_collector);
        this.bulk_collector.bulk_parts = [];
        let bulk_data = collector.bulk_parts.map((bulkPart) => bulkPart.data);

        try {
            const request = await fetch(this.endpointURL, {
                method: 'put',
                headers: { ...this.headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(bulk_data),
            });
            const result = await request.json();

            for (let [idx, item] of result.entries()) {
                try {
                    APIResponse.checkStatus(item.status, item.data);
                    collector.bulk_parts[idx].callbacks['resolve'](item);
                } catch (e) {
                    collector.bulk_parts[idx].callbacks['reject'](item);
                }
            }
        } catch (error) {
            throw new StatusError(error.status, error.data);
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
    /**
     * Method, that loads list of App languages from API.
     * @return {promise} Promise of getting list of App languages from API.
     */
    loadLanguages() {
        return this.bulkQuery({ path: '/_lang/', method: 'get' }).then((response) => {
            return response.data.results;
        });
    }
    /**
     * Method, that gets list of App languages from cache.
     * @return {promise} Promise of getting list of App languages from Cache.
     */
    getLanguagesFromCache() {
        return (
            this.cache
                .get('languages')
                .then((response) => {
                    return JSON.parse(response.data);
                })
                // eslint-disable-next-line no-unused-vars
                .catch((error) => {
                    return this.loadLanguages().then((languages) => {
                        this.cache.set('languages', JSON.stringify(languages));
                        return languages;
                    });
                })
        );
    }
    /**
     * Method, that gets list of App languages.
     * @return {promise} Promise of getting list of App languages.
     */
    getLanguages() {
        if (this.cache) {
            return this.getLanguagesFromCache();
        }
        return this.loadLanguages();
    }
    /**
     * Method, that loads translations for some language from API.
     * @param {string} lang Code of language, translations of which to load.
     * @return {promise} Promise of getting translations for some language from API.
     */
    loadTranslations(lang) {
        return this.bulkQuery({ path: ['_lang', lang], method: 'get' }).then((response) => {
            return response.data.translations;
        });
    }
    /**
     * Method, that gets translations for some language from cache.
     * @param {string} lang Code of language, translations of which to load.
     * @return {promise} Promise of getting translations for some language from Cache.
     */
    getTranslationsFromCache(lang) {
        return (
            this.cache
                .get('translations.' + lang)
                .then((response) => {
                    return JSON.parse(response.data);
                })
                // eslint-disable-next-line no-unused-vars
                .catch((error) => {
                    return this.loadTranslations(lang).then((translations) => {
                        this.cache.set('translations.' + lang, JSON.stringify(translations));
                        return translations;
                    });
                })
        );
    }
    /**
     * Method, that gets translations for some language.
     * @param {string} lang Code of language, translations of which to load.
     * @return {promise} Promise of getting translations for some language.
     */
    getTranslations(lang) {
        if (this.cache) {
            return this.getTranslationsFromCache(lang);
        }
        return this.loadTranslations(lang);
    }
}

/**
 * ApiConnector instance
 *
 * @type {ApiConnector}
 */
const apiConnector = new ApiConnector();

export { ApiConnector, apiConnector, APIResponse };
