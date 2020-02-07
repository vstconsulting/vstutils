guiLocalSettings.setIfNotExists('guiApi.real_query_timeout', 100);

/**
 * Class for Errors connected with API requests.
 */
class StatusError extends Error {
    /**
     * Constructor of StatusError class.
     * @param {number} status Status of HTTP response.
     * @param {string, object} data Error object.
     */
    constructor(status, data){
        super();
        this.status = status;
        this.message = undefined;
        if(typeof data == "string") {
            this.message = data;
        }
        if(typeof data == "object" && data.detail){
            this.message = data.detail;
        }
    }
}


/**
 * Class, that sends API requests.
 */
class ApiConnector { /* jshint unused: false */
    /**
     * Constructor of ApiConnector class.
     * @param {object} config Object with config properties for Api connector.
     * @param {object} openapi Object with OpenAPI schema.
     * @param {object} cache Object, that manages api responses cache operations.
     */
    constructor(config, openapi, cache) {
        /**
         * Object with config properties for Api connector.
         */
        this.config = config;
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
        this.api = axios.create(config); /* globals axios */
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
     * Method, that sends API request.
     * @param {string} method Method of HTTP request.
     * @param {string} url Relative part of link, to which send API requests.
     * @param {object} data Query body.
     */
    query(method, url="", data={}) {
        let with_data_methods = ["post", "put", "patch"];
        let without_data_methods = ["get", "delete"];

        if(with_data_methods.includes(method)) {
            return this.api[method](url, data);
        } else if(without_data_methods.includes(method)) {
            return this.api[method](url);
        }
    }
    /**
     * Method, that collects several bulk requests into one.
     * @param {object} data Body of bulk request.
     */
    bulkQuery(data) {
        if(this.bulk_collector.timeout_id) {
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
        let url = "/" + this.openapi.info.version + "/_bulk/"; /* globals api_version */
        let collector = $.extend(true, {}, this.bulk_collector);
        this.bulk_collector.bulk_parts = [];
        let bulk_data = [];

        for(let index = 0; index < collector.bulk_parts.length; index++) {
            bulk_data.push(collector.bulk_parts[index].data);
        }

        return this.query("put", url, bulk_data).then(response => {
            let result = response.data;

            for(let index = 0; index < result.length; index++) {
                let item = result[index];
                let method = "resolve";

                if(!(item.status >= 200 && item.status < 400)) {
                    debugger;
                    method = "reject";
                }

                collector.bulk_parts[index].callbacks[method](result[index]);
            }

        }).catch(error => {
            debugger;
            throw new StatusError(error.status, error.data);
        });
    }
    /**
     * Method returns URL of API host (server).
     * @return {string}
     */
    getHostUrl() {
        return this.openapi.schemes[0] + "://" + this.openapi.host;
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
        return this.openapi.info["x-user-id"];
    }
    /**
     * Method, that loads data of authorized user.
     * @return {Promise} Promise of getting data of authorized user.
     */
    loadUser() {
        return this.bulkQuery({data_type: ['user', this.getUserId()], method: 'get'}).then(response => {
            return response.data;
        });
    }
    /**
     * Method, that loads list of App languages from API.
     * @return {promise} Promise of getting list of App languages from API.
     */
    loadLanguages() {
        return this.bulkQuery({data_type: ['_lang'], method: 'get'}).then(response => {
            return response.data.results;
        });
    }
    /**
     * Method, that gets list of App languages from cache.
     * @return {promise} Promise of getting list of App languages from Cache.
     */
    getLanguagesFromCache() {
        return this.cache.getFile('languages').then(response => {
            return JSON.parse(response.data);
        }).catch(error => {
            return this.loadLanguages().then(languages => {
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
        if(this.cache) {
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
        return this.bulkQuery({data_type: ['_lang', lang], method: 'get'}).then(response => {
            return response.data.translations;
        });
    }
    /**
     * Method, that gets translations for some language from cache.
     * @param {string} lang Code of language, translations of which to load.
     * @return {promise} Promise of getting translations for some language from Cache.
     */
    getTranslationsFromCache(lang) {
        return this.cache.getFile('translations.' + lang).then(response => {
            return JSON.parse(response.data);
        }).catch(error => {
            return this.loadTranslations(lang).then(translations => {
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
        if(this.cache) {
            return this.getTranslationsFromCache(lang);
        }
        return this.loadTranslations(lang);
    }
}

/**
 * Config for instance of ApiConnector class.
 */
let api_connector_config = { /* jshint unused: false */
    headers: {
        'content-type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
    },
    baseURL: openapi_path.replace("/openapi/", "") + "/api",
};

/**
 * Dictionary, that contains names of openapi schema attributes.
 * This dictionary is needed for easier updates of following opeanapi versions,
 * that can contain another attributes names.
 */
let openapi_dictionary = { /* jshint unused: false */
    models: {
        name: "definitions",
        fields: {
            name: "properties",
        },
        required_fields: {
            name: "required",
        },
        ref_names: ["$ref", "definition_ref"],
        filters_to_delete: ["limit", "offset"],
    },
    paths: {
        name: "paths",
        operation_id: {
            name: "operationId",
        },
        operations: {
            base: {
                remove: {
                    name: 'remove',
                    title: 'remove',
                    icon_classes: ['fa', 'fa-trash'],
                    title_classes: ['d-none', 'd-lg-inline-block'],
                    classes: ['btn-danger', 'danger-right'],
                },
            },
            list: {
                new: {
                    name: 'new',
                    title: 'create',
                    icon_classes: ['fa', 'fa-plus'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
                add: {
                    name: 'add',
                    title: 'add',
                    component: 'gui_add_child_modal',
                },
            },
            page: {
                edit: {
                    name: 'edit',
                    title: 'edit',
                    icon_classes: ['fa', 'fa-pencil-square-o'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
            },
            page_new: {
                save_new: {
                    name: 'save',
                    title: 'save',
                    icon_classes: ['fa', 'fa-floppy-o'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
            },
            page_edit: {
                save: {
                    name: 'save',
                    title: 'save',
                    icon_classes: ['fa', 'fa-floppy-o'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
                reload: {
                    name: 'reload',
                    title: 'reload',
                    icon_classes: ['fa', ' fa-refresh'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
            },
            action: {
                execute: {
                    name: 'execute',
                    title: 'send',
                    icon_classes: ['fa', 'fa-upload'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                }
            },
        },
        multi_actions: ['remove'],
        types_operations_always_to_add: ['page_new', 'page_edit', 'action'],
    },
    schema_types: {
        /**
         * Description of possible properties of some schema type:
         * 'some_schema_type': {
         *     query_type: "post|get|put|patch|delete",         // method of http request, that will be used for API request from view instance
         *     url_postfix: "{string}",                         // postfix, that will be added to view instance URL
         *     type: "{string}",                                // type of view, that will be added to the view's schema
         *     autoupdate: "{boolean}",                         // if true, view instance will automatically send API requests for getting fresh data
         *     hidden: "{boolean}",                             // if true, it means, that views of this type should not be added to the final views dict (they will be removed)
         *     do_not_connect_with_another_views: "{boolean}",  // if true, it means, that views of this type should not be added as sublinks or actions to another views.
         * }
         */
        "_add": {
            query_type: "post",
            url_postfix: "new/",
            type: "page_new",
        },
        "_list": {
            query_type: "get",
            url_postfix: "",
            // name of property from OpenAPI schema, where filters can be find.
            filters: {name: "parameters"},
            type: "list",
            autoupdate: true,
        },
        "_get": {
            query_type: "get",
            url_postfix: "",
            type: "page",
            autoupdate: true,
        },
        "_edit": {
            query_type: "patch",
            url_postfix: "edit/",
            type: "page_edit",
        },
        "_update": {
            query_type: "put",
            url_postfix: "edit/",
            type: "page_edit",
        },
        "_remove": {
            query_type: "delete",
            url_postfix: "remove/",
            type: "page_remove",
            hidden: true,
        },
    }
};