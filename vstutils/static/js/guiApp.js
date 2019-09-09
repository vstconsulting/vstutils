/**
 * Class for a App object.
 * App object - JS object, that has all properties, needed for an application work:
 * - api - object, that manages connection with API (load openapi_schema, send API requests).
 * - models - dict, that has all parsed models from openapi_schema.
 * - views - dict, that has all views, generated for all paths from openapi_schema.
 * - application - object, in this realization it is root Vue component of application,
 *   that has store and router in himself.
 * - files_cache - object, that manages files cache operations.
 * - error_handler - object, that handles errors.
 */
class App {
    /**
     * Constructor of App class.
     * @param {object} api_config Dict with options for ApiConnector constructor.
     */
    constructor(api_config) {
        this.api = new ApiConnector(api_config);
        this.error_handler = new ErrorHandler();
    }
    /**
     * Method, that starts work of app.
     * Method gets openapi_schema, inits models, inits views and mount application to DOM.
     */
    start() {
        return this.api.getSchema().then(openapi_schema => { /* jshint unused: false */
            fieldsRegistrator.registerAllFieldsComponents();
            this.initModels();
            this.initViews();
            this.mountApplication();
        }).catch(error => {
            debugger;
            throw new Error(error);
        });
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
        let models_constructor = new ModelConstructor(openapi_dictionary, guiModels); /* globals ModelConstructor, guiModels */
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
        for(let path in this.views) {
            if (this.views.hasOwnProperty(path)) {
                let view = this.views[path];

                for (let key in view.objects.model.fields) {
                    if(view.objects.model.fields.hasOwnProperty(key)) {
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
     * Method, that creates store and router for an application and mounts it to DOM.
     */
    mountApplication() {
        tabSignal.emit('app.beforeInit', {app: this});

        let store_constructor = new StoreConstructor(this.views);  /* globals StoreConstructor*/
        let routerConstructor = new RouterConstructor( /* globals RouterConstructor */
             /* globals routesComponentsTemplates, customRoutesComponentsTemplates */
            this.views, routesComponentsTemplates, customRoutesComponentsTemplates,
        );

        this.application = new Vue({
            data: {
                info: app.api.openapi.info,
                x_menu: app.api.openapi.info['x-menu'],
                x_docs: app.api.openapi.info['x-docs'],
                a_links: false,
            },
            computed: {
                realBodyClasses() {
                    let cls = "";

                    ['is_superuser', 'is_staff'].forEach(item => {
                        cls += window[item] ? (item + " ") : "";
                    });

                    return cls;
                }
            },
            router: routerConstructor.getRouter(),
            store: store_constructor.getStore(),
        }).$mount('#RealBody');

        // Removes onLoadingErrorHandler,
        // because App does not need it after successful Files Loading.
        window.removeEventListener('error', onLoadingErrorHandler);

        window.guiFilesLoader.hideLoadingProgress();

        tabSignal.emit('app.afterInit', {app: this});
    }
}

/**
 * Creates App instance and saves it app variable.
 */
/* jshint latedef: false */
let app = new App(api_connector_config);

/**
 * Launches our app work.
 */
tabSignal.connect("resource.loaded", () => {
    app.start();
});