import $ from 'jquery';
import Vuex from 'vuex';
import Vue from 'vue';
import AutoUpdateStoreModule from '../autoupdate/AutoUpdateStoreModule.js';
import ComponentStoreModule from './components_state';

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
             * Views - dict with all views objects.
             */
            views: this.views,
            /**
             * Sandbox - dict for storing querysets of views,
             * that can be edited (page_new, page_edit, action types).
             * Key of this dict record is URL of view, Value - queryset.
             */
            sandbox: {},
            /**
             * Filters - dict for saving view's filters values.
             * This dict is for list views only.
             * Key of this dict record is URL of view, Value - object with filters values.
             */
            filters: {},
            /**
             * Selections - dict for saving ids of selected view's model instances.
             * This dict is for list views only.
             * Key of this dict record is instance id,
             * Value - boolean value (selected or not).
             */
            selections: {},
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
             * Mutation, that creates selection dict for a view with current URL.
             * @param {object} state Current state.
             * @param {string} url View's URL.
             */
            setSelection(state, url) {
                Vue.set(state.selections, url, {});
            },
            /**
             * Mutation, that changes selection dict record value to opposite.
             * False || Undefined => True.
             * True => False.
             * @param {object} state Current state.
             * @param {object} obj Object with arguments for this mutation.
             */
            toggleSelectionValue(state, obj) {
                if (state.selections[obj.url][obj.id] == undefined) {
                    state.selections[obj.url][obj.id] = true;
                } else {
                    state.selections[obj.url][obj.id] = !state.selections[obj.url][obj.id];
                }
                state.selections = { ...state.selections };
            },
            /**
             * Mutation, that updates values of several selection dict records.
             * @param {object} state Current state.
             * @param {object} obj Object with arguments for this mutation.
             */
            setSelectionValuesByIds(state, obj) {
                state.selections[obj.url] = $.extend(true, {}, state.selections[obj.url], obj.ids);
                state.selections = { ...state.selections };
            },
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
             * Getter, that returns dict with all views objects.
             */
            getViews: (state) => {
                return state.views;
            },
            /**
             * Getter, that returns view with current path.
             * @param {string} state Current state.
             * @param {string} path View' path.
             */
            getView: (state) => (path) => {
                return state.views[path];
            },
            /**
             * Getter, that returns View's selections from store.selections.
             * @param {string} state Current state.
             * @param {string} url View' url.
             */
            getSelections: (state) => (url) => {
                return state.selections[url];
            },
            /**
             * Getter, that returns View's instance selection value.
             * @param {string} state Current state.
             * @param {object} obj Object with arguments for this getter.
             */
            getSelectionById: (state) => (obj) => {
                return state.selections[obj.url][obj.id];
            },
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

window.StoreConstructor = StoreConstructor;
