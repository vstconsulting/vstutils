import $ from 'jquery';
import axios from 'axios';
import StatusError from './StatusError.js';
import { guiLocalSettings, getCookie } from '../utils';

/**
 * Class, that sends API requests.
 */
export default class ApiConnector {
    /**
     * Constructor of ApiConnector class.
     * @param {object} config Object with config properties for Api connector.
     * @param {object} openapi Object with OpenAPI schema.
     * @param {object} cache Object, that manages api responses cache operations.
     */
    constructor(openapi, cache) {
        /**
         * Object with OpenAPI schema.
         */
        this.openapi = openapi;
        /**
         * Object, that manages api responses cache operations.
         */
        this.cache = cache;
        /**
         * Object with methods for providing Api connection.
         */
        this.api = axios.create(this.create_axios_config(openapi));
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
             *   data: {method: get, data_type: []},
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
    }
    /**
     * Method that creates config for axios instance.
     * @param {object} openapi Object with OpenAPI schema.
     */
    create_axios_config(openapi) {
        const schema = openapi.schemes[0];
        const host = openapi.host;
        const version = openapi.info.version;
        // remove version and ending slash from path (/api/v1/)
        const path = openapi.basePath.replace(version, '').replace(/\/$/, '');
        return {
            headers: {
                'content-type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            baseURL: `${schema}://${host}${path}`,
        };
    }
    /**
     * Method, that sends API request.
     * @param {string} method Method of HTTP request.
     * @param {string} url Relative part of link, to which send API requests.
     * @param {object} data Query body.
     */
    query(method, url = '', data = {}) {
        let with_data_methods = ['post', 'put', 'patch'];
        let without_data_methods = ['get', 'delete'];

        if (with_data_methods.includes(method)) {
            return this.api[method](url, data);
        } else if (without_data_methods.includes(method)) {
            return this.api[method](url);
        }
    }
    /**
     * Method, that collects several bulk requests into one.
     * @param {object} data Body of bulk request.
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
     * @return {promise} Promise of getting bulk request response.
     */
    sendBulk() {
        let url = '/' + this.openapi.info.version + '/_bulk/';
        let collector = $.extend(true, {}, this.bulk_collector);
        this.bulk_collector.bulk_parts = [];
        let bulk_data = [];

        for (let index = 0; index < collector.bulk_parts.length; index++) {
            bulk_data.push(collector.bulk_parts[index].data);
        }

        return this.query('put', url, bulk_data)
            .then((response) => {
                let result = response.data;

                for (let index = 0; index < result.length; index++) {
                    let item = result[index];
                    let method = 'resolve';

                    if (!(item.status >= 200 && item.status < 400)) {
                        debugger;
                        method = 'reject';
                    }

                    collector.bulk_parts[index].callbacks[method](result[index]);
                }
            })
            .catch((error) => {
                debugger;
                throw new StatusError(error.status, error.data);
            });
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
            data_type: ['user', this.getUserId()],
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
        return this.bulkQuery({ data_type: ['_lang'], method: 'get' }).then((response) => {
            return response.data.results;
        });
    }
    /**
     * Method, that gets list of App languages from cache.
     * @return {promise} Promise of getting list of App languages from Cache.
     */
    getLanguagesFromCache() {
        return this.cache
            .getFile('languages')
            .then((response) => {
                return JSON.parse(response.data);
            })
            .catch((error) => {
                /* jshint unused: false */
                return this.loadLanguages().then((languages) => {
                    this.cache.setFile('languages', JSON.stringify(languages));
                    return languages;
                });
            });
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
        return this.bulkQuery({ data_type: ['_lang', lang], method: 'get' }).then((response) => {
            return response.data.translations;
        });
    }
    /**
     * Method, that gets translations for some language from cache.
     * @param {string} lang Code of language, translations of which to load.
     * @return {promise} Promise of getting translations for some language from Cache.
     */
    getTranslationsFromCache(lang) {
        return this.cache
            .getFile('translations.' + lang)
            .then((response) => {
                return JSON.parse(response.data);
            })
            .catch((error) => {
                /* jshint unused: false */
                return this.loadTranslations(lang).then((translations) => {
                    this.cache.setFile('translations.' + lang, JSON.stringify(translations));
                    return translations;
                });
            });
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
