import Vuex from 'vuex';
import Vue from 'vue';
import AutoUpdateStoreModule from '../autoupdate/AutoUpdateStoreModule.js';
import ComponentStoreModule from './components_state';
import * as modules from './components_state/commonStoreModules.js';

export { modules };

export const COMPONENTS_MODULE_NAME = 'componentsStore';

/**
 * Class, that manages Store creation.
 * Store - object, that contains data of all App components.
 * In current realization, Store is Vuex Store.
 * More about Vuex - https://vuex.vuejs.org/.
 */
export class StoreConstructor {
    /**
     * Constructor of StoreConstructor class.
     * @param {object} views Dict with Views objects.
     */
    constructor(views) {
        this.views = views;
        this.store = {
            state: this.getStore_state(),
            mutations: this.getStore_mutations(),
            getters: this.getStore_getters(),
            actions: this.getStore_actions(),
            modules: {
                autoupdate: AutoUpdateStoreModule,
                [COMPONENTS_MODULE_NAME]: ComponentStoreModule,
            },
        };
    }
    /**
     * Method, that forms 'state' property of Store object.
     */
    getStore_state() {
        return {
            /**
             * Widgets - dict for storing widgets data from views.
             * Key of this dict record is URL of page(view), Value - dict with widgets data.
             */
            widgets: {},
        };
    }
    /**
     * Method, that forms store mutations - single way of state changing in Vuex store.
     * More about mutations - https://vuex.vuejs.org/guide/mutations.html.
     */
    getStore_mutations() {
        return {
            /**
             * Mutation, that saves widgets data in store.
             * @param {object} state Current state.
             * @param {object} obj Object with arguments for this mutation.
             */
            setWidgets(state, obj) {
                Vue.set(state.widgets, obj.url, obj.data);
            },
        };
    }
    /**
     * Method, that forms store getters - properties/methods, that return data from store.
     * More about getters - https://vuex.vuejs.org/guide/getters.html.
     */
    getStore_getters() {
        return {
            /**
             * Getter, that returns View's widgets data.
             * @param {string} state Current state.
             * @param {string} url View' url.
             */
            getWidgets: (state) => (url) => {
                return state.widgets[url];
            },
        };
    }
    /**
     * Method, that forms store actions - asynchronous operations.
     * More about action - https://vuex.vuejs.org/guide/actions.html.
     */
    getStore_actions() {
        return {};
    }
    /**
     * Method, that returns App store.
     */
    getStore() {
        return new Vuex.Store(this.store);
    }
}
