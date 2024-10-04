import type { ComponentOptions } from 'vue';
import type VueRouter from 'vue-router';
import Vue from 'vue';

import type { Centrifuge as CentrifugeBase } from 'centrifuge';
import { defineStore } from 'pinia';
import type { CustomVueI18n } from './translation';

import { ActionsManager } from '#vstutils/actions';
import type { ApiConnector } from './api';
import { apiConnector } from '#vstutils/api';
import type { Language } from '#vstutils/api/TranslationsManager';
import { TranslationsManager } from '#vstutils/api/TranslationsManager';
import type { AppSchema } from '#vstutils/schema';
import AppRoot from '#vstutils/AppRoot.vue';
import { AutoUpdateController } from '#vstutils/autoupdate';
import type { ComponentsRegistrator } from '#vstutils/ComponentsRegistrator';
import { globalComponentsRegistrator } from '#vstutils/ComponentsRegistrator';
import { addDefaultFields, FieldsResolver } from '#vstutils/fields';
import type { ModelConstructor } from '#vstutils/models';
import { ModelsResolver } from '#vstutils/models';
import { ErrorHandler } from '#vstutils/popUp';
import { QuerySetsResolver } from '#vstutils/querySet';
import { RouterConstructor } from '#vstutils/router';
import {
    APP_AFTER_INIT,
    APP_BEFORE_INIT,
    APP_CREATED,
    SCHEMA_MODELS_CREATED,
    signals,
} from '#vstutils/signals';
import type { GlobalStore, LocalSettingsStore, UserSettingsStore } from '#vstutils/store';
import { createLocalSettingsStore, createUserSettingsStore, GLOBAL_STORE, pinia } from '#vstutils/store';
import { i18n } from '#vstutils/translation';
import * as utils from '#vstutils/utils';
import type { IView, BaseView } from '#vstutils/views';
import { ListView, PageNewView, PageView, ViewsTree } from '#vstutils/views';
import ViewConstructor from '#vstutils/views/ViewConstructor.js';
import { setupPushNotifications } from '#vstutils/webpush';
import type { UserProfile, InitAppConfig } from './init-app';

import type { GlobalStoreInitialized } from '#vstutils/store/globalStore';

export interface Centrifuge extends CentrifugeBase {
    isConnected: boolean;
}

export async function getCentrifugoClient(address?: string, token?: string): Promise<Centrifuge | undefined> {
    if (!address) {
        return;
    }
    const { Centrifuge, State } = await import('centrifuge');
    class CentrifugoClient extends Centrifuge {
        get isConnected() {
            return this.state === State.Connected;
        }
    }
    const client = new CentrifugoClient(address);
    if (token) {
        client.setToken(token);
    }
    return client;
}

type TAppRoot = InstanceType<typeof AppRoot>;

export interface IApp {
    config: InitAppConfig;
    vue: typeof Vue;
    version: string;
    defaultPageLimit: number;
    schema: AppSchema;
    userProfile: UserProfile;
    projectName: string;

    fieldsResolver: FieldsResolver;
    modelsResolver: ModelsResolver;
    translationsManager: TranslationsManager;
    qsResolver: QuerySetsResolver | null;
    error_handler: ErrorHandler;
    viewsTree: ViewsTree | null;
    global_components: ComponentsRegistrator;

    centrifugoClient?: Centrifuge;

    router: VueRouter | null;
    i18n: CustomVueI18n;

    api: ApiConnector;
    languages: Language[] | null;

    appRootComponent: ComponentOptions<Vue>;
    additionalRootMixins: ComponentOptions<Vue>[];

    views: Map<string, IView>;

    store: GlobalStore;
    userSettingsStore?: UserSettingsStore;

    localSettingsStore: LocalSettingsStore | null;
    localSettingsModel: ModelConstructor | null;

    autoUpdateController: AutoUpdateController;

    actions: ActionsManager;

    rootVm: TAppRoot | null;

    darkModeEnabled: boolean;

    start(): Promise<void>;
    mount(target: HTMLElement | string): void;

    initActionConfirmationModal(options: { title: string }): Promise<void>;
    openReloadPageModal(): void;
    setLanguage(lang: string): void;

    _mounted?: InstanceType<typeof Vue>;
}

export interface IAppInitialized extends IApp {
    router: VueRouter;
    rootVm: TAppRoot;
    localSettingsStore: LocalSettingsStore;
    localSettingsModel: ModelConstructor;
    userSettingsStore: UserSettingsStore;
    viewsTree: ViewsTree;
    store: GlobalStoreInitialized;
}

interface AppParams {
    config: InitAppConfig;
    schema: AppSchema;
    userProfile: UserProfile;
    vue?: typeof Vue;
}

export class App implements IApp {
    config: InitAppConfig;
    vue: typeof Vue;
    version: string;
    defaultPageLimit: number;
    schema: AppSchema;
    projectName: string;

    fieldsResolver: FieldsResolver;
    modelsResolver: ModelsResolver;
    translationsManager: TranslationsManager;
    qsResolver: QuerySetsResolver | null;
    error_handler: ErrorHandler;
    viewsTree: ViewsTree | null = null;
    global_components: ComponentsRegistrator;

    centrifugoClientPromise: Promise<Centrifuge | undefined>;
    centrifugoClient?: Centrifuge;

    router: VueRouter | null;
    i18n: CustomVueI18n;

    api: ApiConnector;
    languages: Language[] | null;
    userProfile: UserProfile;

    appRootComponent: ComponentOptions<Vue>;
    additionalRootMixins: ComponentOptions<Vue>[];

    views = new Map<string, IView>();

    store: GlobalStore;
    userSettingsStore?: UserSettingsStore;

    localSettingsStore: LocalSettingsStore | null = null;
    localSettingsModel: ModelConstructor | null;

    autoUpdateController: AutoUpdateController;

    actions: ActionsManager;

    rootVm: TAppRoot | null = null;
    application: unknown | null = null;
    _mounted?: InstanceType<typeof Vue>;

    constructor({ config, schema, vue, userProfile }: AppParams) {
        globalThis.__currentApp = this;
        this.config = config;

        this.vue = vue ?? Vue;
        this.schema = schema;
        this.userProfile = userProfile;
        this.router = null;
        this.i18n = i18n;
        this.version = this.schema.info['x-versions'].application;
        this.defaultPageLimit = this.schema.info['x-page-limit'] ?? 20;
        this.projectName = this.schema.info.title;

        /**
         * Object, that manages connection with API (sends API requests).
         */
        this.api = apiConnector.initConfiguration(this);

        this.translationsManager = new TranslationsManager(config);

        this.centrifugoClientPromise = getCentrifugoClient(
            this.schema.info['x-centrifugo-address'],
            this.schema.info['x-centrifugo-token'],
        );

        /**
         * Object, that handles errors.
         */
        this.error_handler = new ErrorHandler();

        this.languages = null;
        /**
         * Object that stores Vue components which are must be registered globally
         */
        this.global_components = globalComponentsRegistrator;
        /**
         * Root Vue component
         */
        this.appRootComponent = AppRoot as unknown as ComponentOptions<Vue>;
        this.additionalRootMixins = [];

        this.fieldsResolver = new FieldsResolver(this.schema);
        addDefaultFields(this.fieldsResolver);
        this.modelsResolver = new ModelsResolver(this.fieldsResolver, this.schema);

        /** @type {QuerySetsResolver} */
        this.qsResolver = null;

        this.store = defineStore('global', GLOBAL_STORE)(pinia);

        this.autoUpdateController = new AutoUpdateController(
            () => this.centrifugoClient,
            this.schema.info['x-subscriptions-prefix'],
        );

        this.localSettingsModel = null;

        this.actions = new ActionsManager(this);

        setupPushNotifications(this);

        config.auth.userManager.startSilentRenew();
        config.auth.userManager.events.addSilentRenewError((e) => {
            if ('error' in e && e.error === 'invalid_request') {
                window.location.reload();
                return;
            }
            console.log('Silent renew error', e);
        });

        signals.emit(APP_CREATED, this);
    }

    async start() {
        await this.api.initialized();
        if (this.centrifugoClientPromise) {
            this.centrifugoClient = await this.centrifugoClientPromise;
            if (this.centrifugoClient) {
                this.centrifugoClient.connect();
            }
        }

        let userSettingsModel: ModelConstructor;
        try {
            userSettingsModel = this.modelsResolver.byReferencePath('#/definitions/_UserSettings');
        } catch (e) {
            console.error('Cannot find user settings model', e);
            userSettingsModel = this.modelsResolver.bySchemaObject({});
        }
        this.userSettingsStore = createUserSettingsStore(this.api, userSettingsModel)(pinia);

        const [languages, translations] = await Promise.all([
            this.translationsManager.loadLanguages(),
            this.translationsManager.loadTranslations(this.i18n.locale),
            this.userSettingsStore.init(),
        ]);
        this.languages = languages;
        this.i18n.setLocaleMessage(this.i18n.locale, translations);

        void this.setLanguage(this.i18n.locale, { skipLoad: true });

        this.afterInitialDataBeforeMount();

        this.global_components.registerAll(this.vue);

        return this.prepare();
    }

    getCurrentViewPath(this: IAppInitialized) {
        const route = this.router.currentRoute;
        const view = route.meta?.view as BaseView | undefined;
        return view?.path;
    }

    afterInitialDataBeforeMount() {
        this.generateDefinitionsModels();

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.views = new ViewConstructor(undefined, this.modelsResolver, this.fieldsResolver).generateViews(
            this.schema,
        );

        this.viewsTree = new ViewsTree(this.views);
        this.qsResolver = new QuerySetsResolver(this.viewsTree);

        this.setNestedViewsQuerysets();
    }

    generateDefinitionsModels() {
        for (const name of Object.keys(this.schema.definitions)) {
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
            const models = new Set<ModelConstructor>();

            if (view.objects) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                for (const m of Object.values(view.objects.models)) {
                    if (Array.isArray(m)) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                        for (const model of m) models.add(model);
                    } else {
                        models.add(m!);
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
                const modelName = listView.objects.getResponseModelClass(utils.RequestTypes.LIST)!.name;
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
    async setLanguage(lang: string, opts?: { skipLoad?: boolean }) {
        if (!opts?.skipLoad) {
            await this._prefetchTranslation(lang);
        }
        this.i18n.locale = lang;
        signals.emit('app.language.changed', { lang });
        document.documentElement.setAttribute('lang', lang);
        document.cookie = `lang=${lang}`;
        return lang;
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
            .loadTranslations(lang)
            .then((transitions) => this.i18n.setLocaleMessage(lang, transitions));
    }

    initLocalSettings() {
        this.localSettingsModel = this.modelsResolver.bySchemaObject({}, '_LocalSettings');
        this.localSettingsStore = createLocalSettingsStore(
            window.localStorage,
            'localSettings',
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            this.localSettingsModel as ModelConstructor,
        )(pinia);
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

        /* eslint-disable */
        Vue.prototype.$app = this;
        Vue.prototype.$u = utils;
        Vue.prototype.$st = i18n.st.bind(i18n);
        Vue.prototype.$ts = i18n.ts.bind(i18n);
        /* eslint-enable */

        this.rootVm = new Vue({
            mixins: [this.appRootComponent, ...this.additionalRootMixins],
            propsData: {
                info: this.schema.info,
                x_menu: this.schema.info['x-menu'],
                x_docs: this.schema.info['x-docs'],
            },
            pinia,
            router: this.router,
            i18n: this.i18n,
        });
        this.application = this.rootVm as unknown as Vue;
        signals.emit(APP_AFTER_INIT, { app: this });
        utils.__setApp(this as unknown as IAppInitialized);
    }

    get darkModeEnabled() {
        return (this.userSettingsStore?.settings.main?.dark_mode as boolean | undefined) ?? false;
    }

    mount(target: HTMLElement | string) {
        if (!this.rootVm) {
            throw new Error('Please initialize app first');
        }
        // @ts-expect-error Vue 2 types is a mess
        this._mounted = this.rootVm.$mount(target);
    }

    initActionConfirmationModal({ title }: { title: string }): Promise<void> {
        return new Promise((resolve) => {
            if (this.rootVm?.appModals) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                this.rootVm.appModals!.initActionConfirmationModal(() => resolve(), title);
            }
        });
    }

    openReloadPageModal() {
        if (this.rootVm?.appModals) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            this.rootVm.appModals!.openReloadPageModal();
        }
    }
}
