import Vue from 'vue';
import BaseApp from './BaseApp.js';
import { openapi_dictionary } from './vstutils/api';
import { capitalize, guiLocalSettings, RequestTypes } from './vstutils/utils';
import { PageNewView, ViewConstructor, ViewsTree } from './vstutils/views';
import { StoreConstructor } from './vstutils/store';
import { ModelsResolver } from './vstutils/models';
import { RouterConstructor, mixins as routerMixins } from './vstutils/router';
import { QuerySetsResolver } from './vstutils/querySet';
import { signals } from './app.common.js';
import * as utils from './vstutils/utils';
import { FieldsResolver, addDefaultFields } from './vstutils/fields';
import { APP_CREATED } from './vstutils/signals.js';

export * from './app.common.js';

/**
 * Class for a App object.
 * App object - JS object, that has all properties, needed for an application work.
 */
export class App extends BaseApp {
    /**
     * Constructor of App class.
     * @param {AppConfiguration} config Object with OpenAPI schema.
     * @param {FakeCache} cache Cache instance (is supposed to be instance of FilesCache class).
     */
    constructor(config, cache) {
        super(config, cache);
        this.fieldsResolver = new FieldsResolver(this.config.schema);
        addDefaultFields(this.fieldsResolver);
        this.modelsResolver = new ModelsResolver(this.fieldsResolver, this.config.schema);

        /** @type {Map<string, View>} */
        this.views = null;

        /** @type {QuerySetsResolver} */
        this.qsResolver = null;

        let storeConstructor = new StoreConstructor(this, this.config.isDebug);
        signals.emit('app.beforeInitStore', { storeConstructor });
        this.store = storeConstructor.getStore();

        /**
         * Main(root) Vue instance for current application, that has access to the app store and app router.
         */
        this.application = null;

        signals.emit(APP_CREATED, this);
    }

    smartTranslate(text) {
        if (text === undefined || text === null) {
            return '';
        }

        text = String(text);

        if (this.i18n.te(text)) {
            return this.i18n.t(text);
        }

        const lower = text.toLowerCase();
        if (this.i18n.te(lower)) {
            return capitalize(this.i18n.t(lower));
        }

        return text;
    }

    getCurrentViewPath() {
        return this.application?.$refs?.currentViewComponent?.view?.path;
    }

    afterInitialDataBeforeMount() {
        this.prepareFieldsClasses();

        this.generateDefinitionsModels();

        this.views = new ViewConstructor(
            openapi_dictionary,
            this.modelsResolver,
            this.fieldsResolver,
        ).generateViews(this.config.schema);

        this.viewsTree = new ViewsTree(this.views);
        this.qsResolver = new QuerySetsResolver(this.viewsTree);

        this.setNestedViewsQuerysets();
    }

    generateDefinitionsModels() {
        for (const name of Object.keys(this.config.schema.definitions)) {
            this.modelsResolver.byReferencePath(`#/definitions/${name}`);
        }
        signals.emit('allModels.created', { models: this.modelsResolver._definitionsModels });
    }

    prepareFieldsClasses() {
        for (const fieldClass of this.fieldsResolver.allFieldsClasses()) {
            fieldClass.app = this;
        }
    }

    prepareViewsModelsFields() {
        for (const [path, view] of this.views) {
            const models = new Set();

            if (view.objects) {
                for (const m of Object.values(view.objects.models)) {
                    if (Array.isArray(m)) {
                        for (const model of m) models.add(model);
                    } else {
                        models.add(m);
                    }
                }
            }
            if (view.modelsList) {
                for (const model of view.modelsList) {
                    if (model) models.add(model);
                }
            }

            for (const model of models) {
                if (model) {
                    for (const field of model.fields.values()) {
                        field.prepareFieldForView(path);
                    }
                }
            }

            // Call hook for filter fields
            if (view.filters) {
                for (const field of Object.values(view.filters)) {
                    field.prepareFieldForView(path);
                }
            }
        }
    }

    setNestedViewsQuerysets() {
        for (const view of this.views.values()) {
            if (view instanceof PageNewView && view.nestedAllowAppend) {
                const listView = view.listView;
                const modelName = listView.objects.getResponseModelClass(RequestTypes.LIST).name;
                try {
                    listView.nestedQueryset = this.qsResolver.findQuerySetForNested(modelName, listView.path);
                } catch (e) {
                    console.warn(e);
                    view.nestedAllowAppend = false;
                    listView.actions.delete('add');
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
        return this._prefetchTranslation(lang).then(() => {
            this.i18n.locale = lang;
            guiLocalSettings.set('lang', lang);
            signals.emit('app.language.changed', { lang: lang });
            document.documentElement.setAttribute('lang', lang);
            document.cookie = `lang=${lang}`;
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
        if (!this.languages.find((item) => item.code === lang)) {
            return Promise.reject(false);
        }

        return this.translationsManager
            .getTranslations(lang)
            .then((transitions) => this.i18n.setLocaleMessage(lang, transitions));
    }

    /**
     * Method, that creates store and router for an application and mounts it to DOM.
     */
    prepare() {
        signals.emit('app.beforeInit', { app: this });

        this.prepareViewsModelsFields();

        let routerConstructor = new RouterConstructor(
            this.views,
            routerMixins.customRoutesComponentsTemplates,
        );
        signals.emit('app.beforeInitRouter', { routerConstructor });
        this.router = routerConstructor.getRouter();

        Vue.prototype.$app = this;
        Vue.prototype.$u = utils;
        Vue.prototype.$st = this.smartTranslate.bind(this);

        this.application = new Vue({
            mixins: [this.appRootComponent],
            propsData: {
                info: this.config.schema.info,
                x_menu: this.config.schema.info['x-menu'],
                x_docs: this.config.schema.info['x-docs'],
            },
            router: this.router,
            store: this.store,
            i18n: this.i18n,
        });

        signals.emit('app.afterInit', { app: this });
    }

    mount() {
        this.application.$mount('#RealBody');
    }
}

window.App = App;
