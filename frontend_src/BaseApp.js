import Centrifuge from 'centrifuge';
import { apiConnector } from './vstutils/api';
import { globalComponentsRegistrator } from './vstutils/ComponentsRegistrator.js';
import { ErrorHandler } from './vstutils/popUp';
import { guiLocalSettings } from './vstutils/utils';
import AppRoot from './vstutils/AppRoot.vue';
import { TranslationsManager } from './vstutils/api/TranslationsManager.js';

/**
 * @param {string} address
 * @param {string} [token]
 * @return {null|Centrifuge}
 */
export function getCentrifugoClient(address, token) {
    if (!address) {
        return null;
    }
    const client = new Centrifuge(new URL('connection/websocket', address).toString());
    if (token) {
        client.setToken(token);
    }
    return client;
}

export default class BaseApp {
    /**
     * Constructor of App class.
     * @param {AppConfiguration} config Object with OpenAPI schema.
     * @param {FakeCache} cache Object, that manages api responses cache operations.
     */
    constructor(config, cache) {
        this.config = config;

        this.schema = config.schema;
        /**
         * Application router. Will be available after BaseApp#mountApplication.
         * @type {VueRouter}
         */
        this.router = null;
        this.cache = cache;
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
        /**
         * Array, that stores objects, containing language's name and code.
         */
        this.languages = null;
        /**
         * Dict, that stores translations for each language.
         */
        this.translations = null;
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
        this.appRootComponent = AppRoot;
    }

    /**
     * Method that will be called in start() after loading of languages,
     * translations, users and registration of components. And before
     * mounting of application.
     */
    afterInitialDataBeforeMount() {}
    /**
     * Method, that starts work of app.
     * Method gets openapi_schema, inits models, inits views and mounts application to DOM.
     */
    async start() {
        const LANG = guiLocalSettings.get('lang') || 'en';

        if (this.centrifugoClient) {
            this.centrifugoClient.connect();
        }

        const [languages, translations, user] = await Promise.all([
            this.translationsManager.getLanguages(),
            this.translationsManager.getTranslations(LANG),
            this.api.loadUser(),
        ]);
        this.languages = languages;
        this.translations = { [LANG]: translations };
        this.user = user;

        this.afterInitialDataBeforeMount();

        this.global_components.registerAll();

        this.prepare();
    }

    /**
     * Method can be used to change root Vue component
     *
     * @param component {object}
     */
    changeAppRootComponent(component) {
        this.appRootComponent = component;
    }

    /**
     * Method can be used to reset root Vue component to default value
     */
    resetAppRootComponent() {
        this.appRootComponent = AppRoot;
    }

    /**
     * Method, that creates store and router for an application and mounts it to DOM.
     */
    prepare() {}
}
