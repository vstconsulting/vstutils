import type { Vue } from 'vue/types/vue';
import type { ComponentOptions } from 'vue';
import type VueRouter from 'vue-router';

import Centrifuge from 'centrifuge';
import { defineStore } from 'pinia';
import VueI18n from 'vue-i18n';

import { ActionsManager } from '@/vstutils/actions';
import { apiConnector, ApiConnector, openapi_dictionary } from '@/vstutils/api';
import { Language, TranslationsManager } from '@/vstutils/api/TranslationsManager';
import { AppConfiguration } from '@/vstutils/AppConfiguration';
import AppRoot from '@/vstutils/AppRoot.vue';
import { AutoUpdateController } from '@/vstutils/autoupdate';
import { ComponentsRegistrator, globalComponentsRegistrator } from '@/vstutils/ComponentsRegistrator';
import { addDefaultFields, FieldsResolver } from '@/vstutils/fields';
import { Model, ModelsResolver } from '@/vstutils/models';
import { ErrorHandler } from '@/vstutils/popUp';
import { QuerySetsResolver } from '@/vstutils/querySet';
import { RouterConstructor } from '@/vstutils/router';
import {
    APP_AFTER_INIT,
    APP_BEFORE_INIT,
    APP_CREATED,
    SCHEMA_MODELS_CREATED,
    signals,
} from '@/vstutils/signals';
import {
    createLocalSettingsStore,
    createUserSettingsStore,
    GLOBAL_STORE,
    GlobalStore,
    LocalSettingsStore,
    pinia,
    UserSettingsStore,
} from '@/vstutils/store';
import { i18n } from '@/vstutils/translation';
import * as utils from '@/vstutils/utils';
import { ListView, PageNewView, PageView, View, ViewConstructor, ViewsTree } from '@/vstutils/views';

import type { Cache } from '@/cache';
import { GlobalStoreInitialized } from './store/globalStore';

export function getCentrifugoClient(address?: string, token?: string) {
    if (!address) {
        return null;
    }
    const client = new Centrifuge(address);
    if (token) {
        client.setToken(token);
    }
    return client;
}

interface IAppRoot extends Vue {
    initConfirmation(callback: () => void, title: string): void;
}

export interface IApp {
    config: AppConfiguration;
    vue: typeof Vue;
    cache: Cache;

    schema: AppConfiguration['schema'];

    fieldsResolver: FieldsResolver;
    modelsResolver: ModelsResolver;
    translationsManager: TranslationsManager;
    qsResolver: QuerySetsResolver | null;
    error_handler: ErrorHandler;
    viewsTree: ViewsTree | null;
    global_components: ComponentsRegistrator;

    centrifugoClient: Centrifuge | null;

    router: VueRouter | null;
    i18n: VueI18n;

    api: ApiConnector;
    languages: Language[] | null;
    user: Model | null;

    additionalRootMixins: any[];

    views: Map<string, View>;

    store: GlobalStore;
    userSettingsStore: UserSettingsStore;

    localSettingsStore: LocalSettingsStore | null;
    localSettingsModel: typeof Model | null;

    autoUpdateController: AutoUpdateController;

    actions: ActionsManager;

    rootVm: IAppRoot | null;

    start(): void;
    mount(target: HTMLElement | string): void;
}

export interface IAppInitialized extends IApp {
    router: VueRouter;
    user: Model;
    rootVm: IAppRoot;
    localSettingsStore: LocalSettingsStore;
    localSettingsModel: typeof Model;
    viewsTree: ViewsTree;
    store: GlobalStoreInitialized;
}

export class App implements IApp {
    config: AppConfiguration;
    vue: typeof Vue;
    cache: Cache;

    schema: AppConfiguration['schema'];

    fieldsResolver: FieldsResolver;
    modelsResolver: ModelsResolver;
    translationsManager: TranslationsManager;
    qsResolver: QuerySetsResolver | null;
    error_handler: ErrorHandler;
    viewsTree: ViewsTree | null = null;
    global_components: ComponentsRegistrator;

    centrifugoClient: Centrifuge | null;

    router: VueRouter | null;
    i18n: VueI18n;

    api: ApiConnector;
    languages: Language[] | null;
    rawUser: Record<string, any> | null;
    user: Model | null;

    appRootComponent: ComponentOptions<Vue>;
    additionalRootMixins: ComponentOptions<Vue>[];

    views = new Map<string, View>();

    store: GlobalStore;
    userSettingsStore: UserSettingsStore;

    localSettingsStore: LocalSettingsStore | null = null;
    localSettingsModel: typeof Model | null;

    autoUpdateController: AutoUpdateController;

    actions: ActionsManager;

    rootVm: IAppRoot | null = null;
    application: Vue | null = null;

    constructor(config: AppConfiguration, cache: Cache, vue?: typeof Vue) {
        globalThis.__currentApp = this;
        this.config = config;

        this.vue = vue ?? globalThis.Vue;
        this.schema = config.schema;
        this.router = null;
        this.cache = cache;
        this.i18n = i18n;

        /**
         * Object, that manages connection with API (sends API requests).
         */
        this.api = apiConnector.initConfiguration(config);

        this.translationsManager = new TranslationsManager(apiConnector, cache);

        this.centrifugoClient = getCentrifugoClient(
            this.schema.info['x-centrifugo-address'],
            this.schema.info['x-centrifugo-token'],
        );

        /**
         * Object, that handles errors.
         */
        this.error_handler = new ErrorHandler();

        this.languages = null;
        /**
         * Property that stores raw user response
         * @type {Object|null}
         */
        this.rawUser = null;
        /**
         * Object, that stores data of authorized user.
         */
        this.user = null;
        /**
         * Object that stores Vue components which are must be registered globally
         */
        this.global_components = globalComponentsRegistrator;
        /**
         * Root Vue component
         */
        this.appRootComponent = AppRoot as unknown as ComponentOptions<Vue>;
        this.additionalRootMixins = [];

        this.fieldsResolver = new FieldsResolver(this.config.schema);
        addDefaultFields(this.fieldsResolver);
        this.modelsResolver = new ModelsResolver(this.fieldsResolver, this.config.schema);

        /** @type {QuerySetsResolver} */
        this.qsResolver = null;

        this.userSettingsStore = createUserSettingsStore(this.api)(pinia);
        this.store = defineStore('global', GLOBAL_STORE)(pinia);

        this.autoUpdateController = new AutoUpdateController(
            this.centrifugoClient,
            this.schema.info['x-subscriptions-prefix'],
        );

        this.localSettingsModel = null;

        this.actions = new ActionsManager(this);

        signals.emit(APP_CREATED, this);
    }

    loadSettings() {
        return this.userSettingsStore.load();
    }

    async start() {
        if (this.centrifugoClient) {
            this.centrifugoClient.connect();
        }

        const [languages, translations, rawUser] = await Promise.all([
            this.translationsManager.getLanguages(),
            this.translationsManager.getTranslations(this.i18n.locale),
            this.api.loadUser(),
            this.loadSettings(),
        ]);
        this.languages = languages;
        this.i18n.messages[this.i18n.locale] = translations;
        this.rawUser = rawUser;

        void this.setLanguage(this.i18n.locale);

        this.afterInitialDataBeforeMount();

        const usersQs = this.views.get('/user/')?.objects;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const UserModel = usersQs?.getModelClass(utils.RequestTypes.RETRIEVE);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        this.user = new UserModel(this.rawUser, usersQs);

        this.global_components.registerAll(this.vue);

        this.prepare();
    }

    getCurrentViewPath(this: IAppInitialized) {
        const route = this.router.currentRoute;
        const view = route.meta?.view as View | undefined;
        return view?.path;
    }

    afterInitialDataBeforeMount() {
        this.generateDefinitionsModels();

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
        signals.emit(SCHEMA_MODELS_CREATED, { app: this, models: this.modelsResolver._definitionsModels });
    }

    changeAppRootComponent(component: ComponentOptions<Vue>) {
        this.appRootComponent = component;
    }

    resetAppRootComponent() {
        this.appRootComponent = AppRoot as unknown as ComponentOptions<Vue>;
    }

    prepareViewsModelsFields() {
        for (const [path, view] of this.views) {
            const models = new Set<typeof Model>();

            if (view.objects) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                for (const m of Object.values(view.objects.models)) {
                    if (Array.isArray(m)) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                        for (const model of m) models.add(model);
                    } else {
                        models.add(m as typeof Model);
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
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                        field.prepareFieldForView(path);
                    }
                }
            }

            // Call hook for filter fields
            if (view instanceof ListView && view.filters) {
                for (const field of Object.values(view.filters)) {
                    field.prepareFieldForView(path);
                }
            }

            // Call hook for detail view filters
            if (view instanceof PageView && view.filtersModelClass) {
                for (const field of view.filtersModelClass.fields.values()) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                    field.prepareFieldForView(path);
                }
            }
        }
    }

    setNestedViewsQuerysets() {
        for (const view of this.views.values()) {
            if (view instanceof PageNewView && view.nestedAllowAppend) {
                const listView = view.listView!;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                const modelName = listView.objects.getResponseModelClass(utils.RequestTypes.LIST).name;
                try {
                    // @ts-expect-error TODO refactor qs resolver to ts
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
     */
    setLanguage(lang: string) {
        return this._prefetchTranslation(lang).then(() => {
            this.i18n.locale = lang;
            signals.emit('app.language.changed', { lang });
            document.documentElement.setAttribute('lang', lang);
            document.cookie = `lang=${lang}`;
            return lang;
        });
    }

    /**
     * Method returns a promise of checking that current language exists and translations for language is loaded.
     * This method is supposed to be called after app was mounted and only from this.setLanguage(lang) method.
     */
    _prefetchTranslation(lang: string): Promise<void> {
        if (!(this.languages ?? []).find((item) => item.code === lang)) {
            return Promise.reject(false);
        }

        return this.translationsManager
            .getTranslations(lang)
            .then((transitions) => this.i18n.setLocaleMessage(lang, transitions));
    }

    initLocalSettings() {
        this.localSettingsModel = this.modelsResolver.bySchemaObject({}, '_LocalSettings');
        this.localSettingsStore = createLocalSettingsStore(window.localStorage, 'localSettings')(pinia);
        this.localSettingsStore.load();
    }

    /**
     * Method, that creates store and router for an application and mounts it to DOM.
     */
    prepare() {
        signals.emit(APP_BEFORE_INIT, { app: this });

        this.prepareViewsModelsFields();
        this.initLocalSettings();

        const routerConstructor = new RouterConstructor(this.views);
        signals.emit('app.beforeInitRouter', { routerConstructor });
        this.router = routerConstructor.getRouter();

        const Vue = this.vue;

        // @ts-expect-error For some reason direct import of vue-router does not work
        //                  in tests, so use router.constructor instead.
        Vue.use(this.router.constructor);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        Vue.prototype.$app = this;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        Vue.prototype.$u = utils;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        Vue.prototype.$st = i18n.st.bind(i18n);

        this.rootVm = new Vue({
            mixins: [this.appRootComponent, ...this.additionalRootMixins],
            propsData: {
                info: this.config.schema.info,
                x_menu: this.config.schema.info['x-menu'],
                x_docs: this.config.schema.info['x-docs'],
            },
            pinia,
            router: this.router,
            i18n: this.i18n,
        });
        this.application = this.rootVm;
        signals.emit(APP_AFTER_INIT, { app: this });
        utils.__setApp(this as unknown as IAppInitialized);
    }

    mount(target: HTMLElement | string = '#RealBody') {
        if (!this.rootVm) {
            throw new Error('Please initialize app first');
        }
        this.rootVm.$mount(target);
    }
}
