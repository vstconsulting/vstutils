import { apiConnector } from './vstutils/api';
import { globalComponentsRegistrator } from './vstutils/ComponentsRegistrator.js';
import { fieldsRegistrator } from './vstutils/fields';
import { ErrorHandler } from './vstutils/popUp';
import { guiLocalSettings } from './vstutils/utils';
import AppRoot from './vstutils/AppRoot.vue';

export default class BaseApp {
    /**
     * Constructor of App class.
     * @param {object} openapi Object with OpenAPI schema.
     * @param {FakeCache} cache Object, that manages api responses cache operations.
     */
    constructor(openapi, cache) {
        this.schema = openapi;
        this.cache = cache;
        /**
         * Object, that manages connection with API (sends API requests).
         */
        this.api = apiConnector;
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
    start() {
        let LANG = guiLocalSettings.get('lang') || 'en';
        let promises = [this.api.getLanguages(), this.api.getTranslations(LANG), this.api.loadUser()];

        return Promise.all(promises)
            .then((response) => {
                this.languages = response[0];
                this.translations = {
                    [LANG]: response[1],
                };
                this.user = response[2];

                fieldsRegistrator.registerAllFieldsComponents();
                this.global_components.registerAll();

                this.afterInitialDataBeforeMount();

                this.mountApplication();
            })
            .catch((error) => {
                console.error(error);
                throw new Error(error);
            });
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
    mountApplication() {}
}
