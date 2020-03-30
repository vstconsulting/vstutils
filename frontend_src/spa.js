import Vue from 'vue';
import BaseApp from './BaseApp.js';
import { openapi_dictionary } from './vstutils/api';
import { guiLocalSettings } from './vstutils/utils';
import { View } from './vstutils/views';
import { StoreConstructor } from "./vstutils/store";
import { RouterConstructor, mixins as routerMixins } from "./vstutils/router";

export * from './app.common.js';
export * from './vstutils/dashboard';

/**
 * Class for a App object.
 * App object - JS object, that has all properties, needed for an application work.
 */
export class App extends BaseApp {
    /**
     * Constructor of App class.
     * @param {object} api_config Dict with options for ApiConnector constructor.
     * @param {object} openapi Object with OpenAPI schema.
     * @param {object} cache Cache instance (is supposed to be instance of FilesCache class).
     */
    constructor(api_config, openapi, cache) {
        super(api_config, openapi, cache);
        /**
         * Dict, that stores all parsed models from OpenAPI schema.
         */
        this.models = null;
        /**
         * Dict, that stores all views, generated for all paths from OpenAPI schema.
         */
        this.views = null;
        /**
         * Main(root) Vue instance for current application, that has access to the app store and app router.
         */
        this.application = null;
    }
    afterInitialDataBeforeMount() {
        this.initModels();
        this.initViews();
    }
    /**
     * Method, that inits Models Objects.
     */
    initModels() {
        this.models = this.generateModels();
    }
    /**
     * Method, that generates Models Objects, based on openapi_schema.
     */
    generateModels() {
        let models_constructor = new ModelConstructor(
            openapi_dictionary,
            guiModels,
        ); /* globals ModelConstructor, guiModels */
        return models_constructor.generateModels(this.api.openapi);
    }
    /**
     * Method, that inits Views Objects.
     */
    initViews() {
        this.views = this.generateViews();
        this.prepareViewsModelsFields();
    }
    /**
     * Method, that generates Views Objects, based on openapi_schema.
     */
    generateViews() {
        let views_constructor = new ViewConstructor(openapi_dictionary, this.models);
        return views_constructor.generateViews(View, this.api.openapi);
    }
    /**
     * Method, that runs through all views
     * and handles all fields with additionalProperties.
     */
    prepareViewsModelsFields() {
        for (let path in this.views) {
            if (this.views.hasOwnProperty(path)) {
                let view = this.views[path];

                for (let key in view.objects.model.fields) {
                    if (view.objects.model.fields.hasOwnProperty(key)) {
                        let field = view.objects.model.fields[key];

                        if (field.constructor.prepareField) {
                            let prepared = field.constructor.prepareField(field, path);

                            view.objects.model.fields[key] = prepared;
                        }
                    }
                }
            }
        }
    }

    /**
     * Method returns a promise of applying some language to app interface.
     * This method is supposed to be called after app was mounted.
     * @param {string} lang Code of language, that should be set as current App language.
     * @return {Promise}
     */
    setLanguage(lang) {
        return this._prefetchTranslation(lang).then((lang) => {
            this.application.$i18n.locale = lang;
            guiLocalSettings.set('lang', lang);
            tabSignal.emit('app.language.changed', { lang: lang });
            return lang;
        });
    }

    /**
     * Method returns a promise of checking that current language exists and translations for language is loaded.
     * This method is supposed to be called after app was mounted and only from this.setLanguage(lang) method.
     * @param {string} lang Code of language, that should be prefetched.
     * @return {Promise}
     */
    _prefetchTranslation(lang) {
        if (
            !Object.values(this.languages)
                .map((item) => item.code)
                .includes(lang)
        ) {
            return Promise.reject(false);
        }

        if (this.translations[lang]) {
            return Promise.resolve(lang);
        }

        return this.api
            .getTranslations(lang)
            .then((transitions) => {
                this.translations = {
                    ...this.translations,
                    [lang]: transitions,
                };

                this.application.$i18n.setLocaleMessage(lang, transitions);
                return lang;
            })
            .catch((error) => {
                debugger;
                throw error;
            });
    }

    /**
     * Method, that creates store and router for an application and mounts it to DOM.
     */
    mountApplication() {
        tabSignal.emit('app.beforeInit', { app: this });

        let store_constructor = new StoreConstructor(this.views);
        let routerConstructor = new RouterConstructor(
            this.views,
            routerMixins.routesComponentsTemplates,
            routerMixins.customRoutesComponentsTemplates,
        );

        let i18n = new VueI18n({
            locale: guiLocalSettings.get('lang') || 'en',
            messages: this.translations,
        });

        this.application = new Vue({
            data: {
                info: this.api.openapi.info,
                x_menu: this.api.openapi.info['x-menu'],
                x_docs: this.api.openapi.info['x-docs'],
                a_links: false,
            },
            computed: {
                realBodyClasses() {
                    let cls = '';

                    ['is_superuser', 'is_staff'].forEach((item) => {
                        cls += window[item] ? item + ' ' : '';
                    });

                    return cls;
                },
            },
            router: routerConstructor.getRouter(),
            store: store_constructor.getStore(),
            i18n: i18n,
        }).$mount('#RealBody');

        tabSignal.emit('app.afterInit', { app: this });
    }
}

window.App = App;
