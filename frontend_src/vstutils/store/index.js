import $ from 'jquery';
import Vuex from 'vuex';

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
             * Objects - dict for storing querysets of readOnly views
             * (list and page types).
             * Key of this dict record is URL of page(view), Value - queryset.
             */
            objects: {},
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
             * Mutation, that saves in state.objects current queryset
             * of view with current URL.
             * @param {object} state Current state.
             * @param {object} obj Object with arguments for this mutation.
             */
            setQuerySet(state, obj) {
                state.objects[obj.url] = obj.queryset;
            },
            /**
             * Mutation, that deletes from state.objects current queryset
             * of view with current URL.
             * @param {object} state Current state.
             * @param {object} obj Object with arguments for this mutation.
             */
            deleteQuerySet(state, obj) {
                delete state.objects[obj.url];
            },
            /**
             * Mutation, that creates selection dict for a view with current URL.
             * @param {object} state Current state.
             * @param {string} url View's URL.
             */
            setSelection(state, url) {
                state.selections[url] = {};
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
             * Mutation, that saves instance's field value or list's filter value in store.
             * @param {object} state Current state.
             * @param {object} obj Object with arguments for this mutation.
             */
            setViewFieldValue(state, obj) {
                state[obj.store][obj.url].cache.data[obj.field] = obj.value;
                state[obj.store][obj.url].cache.data = {
                    ...state[obj.store][obj.url].cache.data,
                };
            },
            /**
             * Mutation, that saves instance's data in store.
             * @param {object} state Current state.
             * @param {object} obj Object with arguments for this mutation.
             */
            setViewInstanceData(state, obj) {
                state[obj.store][obj.url].cache.data = obj.data;
                state[obj.store][obj.url].cache.data = {
                    ...state[obj.store][obj.url].cache.data,
                };
            },
            /**
             * Mutation, that saves in state.sandbox current queryset
             * of view with current URL.
             * @param {object} state Current state.
             * @param {object} obj Object with arguments for this mutation.
             */
            setQuerySetInSandBox(state, obj) {
                state.sandbox[obj.url] = obj.queryset;
            },
            /**
             * Mutation, that deletes from state.sandbox current queryset
             * of view with current URL.
             * @param {object} state Current state.
             * @param {object} obj Object with arguments for this mutation.
             */
            deleteQuerySetFromSandBox(state, obj) {
                delete state.sandbox[obj.url];
            },
            /**
             * Mutation, that creates filters dict for view with current URL.
             * @param {object} state Current state.
             * @param {object} obj Object with arguments for this mutation.
             */
            setFilters(state, obj) {
                state.filters[obj.url] = {
                    cache: {
                        data: obj.filters,
                    },
                };
            },
            /**
             * Mutation, that saves widgets data in store.
             * @param {object} state Current state.
             * @param {object} obj Object with arguments for this mutation.
             */
            setWidgets(state, obj) {
                state.widgets[obj.url] = obj.data;
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
             * Getter, that returns View's queryset from store.objects.
             * @param {string} state Current state.
             * @param {string} url View' url.
             */
            getQuerySet: (state) => (url) => {
                return state.objects[url];
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
             * Getter, that returns View's instance field value or view's filter value.
             * @param {string} state Current state.
             * @param {object} obj Object with arguments for this getter.
             */
            getViewFieldValue: (state) => (obj) => {
                return state[obj.store][obj.url].cache.data[obj.field];
            },
            /**
             * Getter, that returns View's instance data.
             * @param {string} state Current state.
             * @param {object} obj Object with arguments for this getter.
             */
            getViewInstanceData: (state) => (obj) => {
                return state[obj.store][obj.url].cache.data;
            },
            /**
             * Getter, that returns View's queryset from store.sandbox.
             * @param {string} state Current state.
             * @param {string} url View' url.
             */
            getQuerySetFromSandBox: (state) => (url) => {
                return state.sandbox[url];
            },
            /**
             * Getter, that returns View's filters object.
             * @param {string} state Current state.
             * @param {string} url View' url.
             */
            getFilters: (state) => (url) => {
                return state.filters[url];
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
