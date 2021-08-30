import Centrifuge from 'centrifuge';
import { apiConnector } from './vstutils/api';
import { globalComponentsRegistrator } from './vstutils/ComponentsRegistrator.js';
import { ErrorHandler } from './vstutils/popUp';
import { RequestTypes } from './vstutils/utils';
import AppRoot from './vstutils/AppRoot.vue';
import { TranslationsManager } from './vstutils/api/TranslationsManager.js';
import { i18n } from './vstutils/translation.js';

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
        /**
         * Array, that stores objects, containing language's name and code.
         */
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
        if (this.centrifugoClient) {
            this.centrifugoClient.connect();
        }

        const [languages, translations, rawUser] = await Promise.all([
            this.translationsManager.getLanguages(),
            this.translationsManager.getTranslations(this.i18n.locale),
            this.api.loadUser(),
        ]);
        this.languages = languages;
        this.i18n.messages[this.i18n.locale] = translations;
        this.rawUser = rawUser;

        this.setLanguage(this.i18n.locale);

        this.afterInitialDataBeforeMount();

        const usersQs = this.views.get('/user/').objects;
        const UserModel = usersQs.getModelClass(RequestTypes.RETRIEVE);
        this.user = new UserModel(this.rawUser, usersQs);

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
