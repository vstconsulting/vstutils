import VueRouter from 'vue-router';
import { signals } from '@/vstutils/signals';

import type { RouteConfig } from 'vue-router';
import type { IView } from '@/vstutils/views';

export default class RouterConstructor {
    private views: Map<string, IView>;
    private routes: RouteConfig[];

    constructor(views: Map<string, IView>) {
        this.views = views;
        this.routes = this.formAllRoutes();
    }

    /**
     * Method, that returns array of routes objects, existing in current App.
     */
    getRoutes() {
        return this.routes;
    }

    /**
     * Method, that forms array of all routes objects, existing in current App.
     */
    formAllRoutes() {
        const routes: RouteConfig[] = this.formRoutesBasedOnViews();

        signals.emit('allRoutes.created', routes);

        return routes;
    }

    /**
     * Method, that forms array of routes objects, existing in current App, and based on App Views, that have description in OpenAPI Schema (this.views).
     */
    formRoutesBasedOnViews() {
        const routes: RouteConfig[] = [];

        for (const view of this.views.values()) {
            const route = view.toRoute();
            if (route) {
                routes.push(route);
                this.emitSignalAboutRouteCreation(route);
            }
        }

        return routes;
    }

    emitSignalAboutRouteCreation(route: RouteConfig) {
        signals.emit('routes[' + (route.name ?? route.path) + '].created', route);
    }

    getRouter() {
        return new VueRouter({
            routes: this.getRoutes(),
        });
    }
}
