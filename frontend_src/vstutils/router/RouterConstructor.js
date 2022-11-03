import VueRouter from 'vue-router';
import signals from '../signals.js';
import { View } from '../views';
import { NotFound, Home } from '@/vstutils/router/customPages';

export default class RouterConstructor {
    /**
     * Constructor of RouterConstructor Class.
     * @param {Map<string, View>} views Map with views objects.
     * generated by View class and having description in OpenAPI Schema.
     */
    constructor(views) {
        this.views = views;
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
        let routes = [];

        routes = routes.concat(this.formRoutesBasedOnViews());

        signals.emit('allRoutes.created', routes);

        return routes;
    }

    /**
     * Method, that forms array of routes objects, existing in current App, and based on App Views, that have description in OpenAPI Schema (this.views).
     * @return {array} Routes Array.
     */
    formRoutesBasedOnViews() {
        if (!this.views.has('/')) {
            const homeView = new View({ path: '/', routeName: 'home' }, null, [Home]);
            this.views.set('/', homeView);
        }

        if (!this.views.has('*')) {
            const notFoundView = new View({ path: '*', routeName: '404' }, null, [NotFound]);
            this.views.set('*', notFoundView);
        }

        let routes = [];

        for (let view of this.views.values()) {
            if (view.hidden) continue;
            routes.push(view.toRoute());
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
