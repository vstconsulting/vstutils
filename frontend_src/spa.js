import Vue from 'vue';
import VueI18n from 'vue-i18n';
import BaseApp from './BaseApp.js';
import { openapi_dictionary } from './vstutils/api';
import { guiLocalSettings, RequestTypes } from './vstutils/utils';
import { PageNewView, ViewConstructor } from './vstutils/views';
import { StoreConstructor } from './vstutils/store';
import { ModelConstructor, ModelsResolver } from './vstutils/models';
import { RouterConstructor, mixins as routerMixins } from './vstutils/router';
import { QuerySetsResolver } from './vstutils/querySet';
import { signals } from './app.common.js';

export * from './app.common.js';

const RUPluralizationRule = (choice, choicesLength) => {
    if (choice === 0) {
        return 0;
    }

    const teen = choice > 10 && choice < 20;
    const endsWithOne = choice % 10 === 1;

    if (choicesLength < 4) {
        return !teen && endsWithOne ? 1 : 2;
    }
    if (!teen && endsWithOne) {
        return 1;
    }
    if (!teen && choice % 10 >= 2 && choice % 10 <= 4) {
        return 2;
    }

    return choicesLength < 4 ? 2 : 3;
};

/**
 * Class for a App object.
 * App object - JS object, that has all properties, needed for an application work.
 */
export class App extends BaseApp {
    /**
     * Constructor of App class.
     * @param {AppConfiguration} config Object with OpenAPI schema.
     * @param {FakeCache} cache Cache instance (is supposed to be instance of FilesCache class).
     * @param {Map<string, BaseField>} fields
     * @param {Map<string, Function>} models
     */
    constructor(config, cache, fields, models) {
        super(config, cache);

        this.fieldsClasses = fields;
        this.modelsClasses = models;

        /** @type {Map<string, View>} */
        this.views = null;

        /** @type {ModelsResolver} */
        this.modelsResolver = null;

        /** @type {QuerySetsResolver} */
        this.qsResolver = null;

        /**
         * Main(root) Vue instance for current application, that has access to the app store and app router.
         */
        this.application = null;
    }
    afterInitialDataBeforeMount() {
        this.prepareFieldsClasses();

        new ModelConstructor(
            openapi_dictionary,
            this.config.schema,
            this.fieldsClasses,
            this.modelsClasses,
        ).generateModels();

        this.modelsResolver = new ModelsResolver(this.modelsClasses, this.fieldsClasses, this.config.schema);

        this.views = new ViewConstructor(
            openapi_dictionary,
            this.modelsClasses,
            this.fieldsClasses,
        ).generateViews(this.config.schema);

        this.qsResolver = new QuerySetsResolver(this.modelsClasses, this.views);

        this.setNestedViewsQuerysets();

        this.prepareViewsModelsFields();
    }

    prepareFieldsClasses() {
        for (const fieldClass of this.fieldsClasses.values()) {
            fieldClass.app = this;
        }
    }

    prepareViewsModelsFields() {
        for (const [path, view] of this.views) {
            if (!view.objects) continue;
            for (const model of new Set(Object.values(view.objects.models))) {
                for (const field of model.fields.values()) {
                    field.prepareFieldForView(path);
                }
            }
        }
    }

    setNestedViewsQuerysets() {
        for (const view of this.views.values()) {
            if (view instanceof PageNewView && view.nestedAllowAppend) {
                const listView = view.listView;
                const modelName = listView.objects.getModelClass(RequestTypes.LIST).name;
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
        return this._prefetchTranslation(lang).then((lang) => {
            this.application.$i18n.locale = lang;
            guiLocalSettings.set('lang', lang);
            signals.emit('app.language.changed', { lang: lang });
            document.documentElement.setAttribute('lang', lang);
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

        return this.translationsManager
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
                throw error;
            });
    }

    /**
     * Method, that creates store and router for an application and mounts it to DOM.
     */
    prepare() {
        signals.emit('app.beforeInit', { app: this });

        let storeConstructor = new StoreConstructor(this, this.config.isDebug);

        signals.emit('app.beforeInitStore', { storeConstructor });

        let routerConstructor = new RouterConstructor(
            this.views,
            routerMixins.routesComponentsTemplates,
            routerMixins.customRoutesComponentsTemplates,
        );
        signals.emit('app.beforeInitRouter', { routerConstructor });
        this.router = routerConstructor.getRouter();

        let i18n = new VueI18n({
            locale: this.initLanguage,
            messages: this.translations,
            silentTranslationWarn: true,
            pluralizationRules: {
                ru: RUPluralizationRule,
            },
        });

        Vue.prototype.$app = this;

        this.application = new Vue({
            mixins: [this.appRootComponent],
            propsData: {
                info: this.config.schema.info,
                x_menu: this.config.schema.info['x-menu'],
                x_docs: this.config.schema.info['x-docs'],
            },
            router: this.router,
            store: storeConstructor.getStore(),
            i18n: i18n,
        });

        signals.emit('app.afterInit', { app: this });
    }

    mount() {
        this.application.$mount('#RealBody');
    }
}

window.App = App;
