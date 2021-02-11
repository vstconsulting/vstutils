import VueRouter from 'vue-router';
import signals from '../signals.js';

/**
 * Class, that manages Router creation.
 * In current realization, Router is Vue-Router.
 * More about Vue-Router - https://router.vuejs.org/.
 */
export default class RouterConstructor {
    /**
     * Constructor of RouterConstructor Class.
     * @param {Map<string, View>} views Dict with views objects.
     * @param {object} components_templates Dict with mixins for Vue components of Views,
     * generated by View class and having description in OpenAPI Schema.
     * @param {object} custom_components_templates Dict with mixins for Vue components
     * of custom Views, that have no description in OpenAPI Schema (home page, 404 error page).
     */
    constructor(views, components_templates, custom_components_templates) {
        this.views = views;
        this.components_templates = components_templates;
        this.custom_components_templates = custom_components_templates;
        this.routes = this.formAllRoutes();
    }

    /**
     * Method, that returns array of routes objects, existing in current App.
     * @return {array} Routes Array.
     */
    getRoutes() {
        return this.routes;
    }

    /**
     * Method, that forms array of all routes objects, existing in current App.
     * @return {array} Routes Array.
     */
    formAllRoutes() {
        let routes = [
            {
                name: 'home',
                path: '/',
                component: this.custom_components_templates.home || {},
            },
        ];

        this.emitSignalAboutRouteCreation(routes.last);

        routes = routes.concat(this.formRoutesBasedOnViews(), this.formRoutesBasedOnCustomComponents(), {
            name: '404',
            path: '*',
            component: this.custom_components_templates['404'] || {},
        });

        this.emitSignalAboutRouteCreation(routes.last);

        signals.emit('allRoutes.created', routes);

        return routes;
    }

    /**
     * Method, that forms array of routes objects, existing in current App, and based on App Views, that have description in OpenAPI Schema (this.views).
     * @return {array} Routes Array.
     */
    formRoutesBasedOnViews() {
        let routes = [];
        for (let view of this.views.values()) {
            if (view.hidden) continue;
            routes.push(view.toRoute());
            this.emitSignalAboutRouteCreation(routes.last);
        }
        return routes;
    }

    /**
     * Method, that forms array of possible routes of App based on App custom views components
     * (this.custom_components_templates).
     * @return {array} Routes Array.
     */
    formRoutesBasedOnCustomComponents() {
        let routes = [];

        for (let item in this.custom_components_templates) {
            if (!Object.prototype.hasOwnProperty.call(this.custom_components_templates, item)) {
                continue;
            }

            if (['home', '404'].includes(item)) {
                continue;
            }

            let path_template = item.replace(/{/g, ':').replace(/}/g, '');

            if (
                this.custom_components_templates[item].getPathTemplateForRouter &&
                typeof this.custom_components_templates[item].getPathTemplateForRouter === 'function'
            ) {
                path_template = this.custom_components_templates[item].getPathTemplateForRouter(item);
            }

            routes.push({
                name: item,
                path: path_template,
                component: this.custom_components_templates[item],
            });

            this.emitSignalAboutRouteCreation(routes.last);
        }

        return routes;
    }

    /**
     * Method emits signal: "route was created".
     * @param {object} route Object with route properties (name, path, component).
     */
    emitSignalAboutRouteCreation(route) {
        signals.emit('routes[' + route.name + '].created', route);
    }

    /**
     * Method, that returns new instance of VueRouter.
     * @return {VueRouter}
     */
    getRouter() {
        return new VueRouter({
            routes: this.getRoutes(),
        });
    }
}
