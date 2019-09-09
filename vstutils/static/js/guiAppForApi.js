/**
 * Class for a AppForApi object.
 */
class AppForApi {
    /**
     * Constructor of AppForApi class.
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
            this.mountApplication();
        }).catch(error => {
            debugger;
            throw new Error(error);
        });
    }
    /**
     * Method, that creates store and router for an application and mounts it to DOM.
     */
    mountApplication() {
        tabSignal.emit('app.beforeInit', {app: this});

        function setOriginalLinks(menu) {
            for(let index = 0; index < menu.length; index++) {
                let item = menu[index];

                if(item.url) {
                    item.origin_link = true;
                    item.url = hostname + '/#' + item.url;
                }

                if(item.sublinks) {
                    item.sublinks = setOriginalLinks(item.sublinks);
                }
            }

            return menu;
        }

        let x_menu = setOriginalLinks([ ...app.api.openapi.info['x-menu']]);

        this.top_nav = new Vue({
            data: {
                a_links: true,
            },
        }).$mount('#top_nav_wrapper');

        this.sidebar = new Vue({
            data: {
                info: app.api.openapi.info,
                x_menu: x_menu,
                x_docs: app.api.openapi.info['x-docs'],
                a_links: true,
            },
        }).$mount('#sidebar_wrapper');

        this.gui_customizer = new Vue().$mount('#gui_customizer_wrapper');

        this.footer = new Vue().$mount('#main_footer_wrapper');

        // Removes onLoadingErrorHandler,
        // because App does not need it after successful Files Loading.
        window.removeEventListener('error', onLoadingErrorHandler);

        window.guiFilesLoader.hideLoadingProgress();

        tabSignal.emit('app.afterInit', {app: this});
    }
}

/**
 * Creates AppForApi instance and saves in app variable.
 */
/* jshint latedef: false */
let app = new AppForApi(api_connector_config);

/**
 * Launches our app work.
 */
tabSignal.connect("resource.loaded", () => {
    app.start();
});