import { guiQuerySets } from '../querySet';
import Vue from 'vue';
import { mergeDeep } from '../utils';

const LIST_STORE_MODULE = {
    state: {
        data: {
            filters: undefined,
            instances: [],
            pagination: {
                count: 0,
                page_size: 20,
                page_number: 1,
            },
        },
    },
    getters: {
        filters: (state) => {
            return state.data.filters;
        },
    },
    mutations: {
        setFilters(state, { filters, url }) {
            state.data.filters = filters;
            if (url) {
                url = url.replace(/^\/|\/$/g, '');
                this.commit('setFilters', { filters, url }, { root: true });
            }
        },

        setInstances(state, instances) {
            state.data.instances = instances;
            if (instances.extra !== undefined && instances.extra['count'] !== undefined) {
                state.data.pagination.count = instances.extra['count'];
            }
            state.data.pagination.page_number = state.data.filters['page'] || 1;
        },
    },
    actions: {
        async fetchData({ commit, getters, state }, { view, url, qs, filters }) {
            if (filters) {
                commit('setFilters', { filters });
            }

            commit('setQuerySet', { view, url, qs });

            if (qs === undefined) {
                qs = getters.queryset.filter({ ...state.data.filters }).prefetch();
            }
            commit('setQuerySet', { view, url, qs });

            const instances = await getters.queryset.items();
            commit('setInstances', instances);
        },

        async updateData({ commit, getters }) {
            const instances = await getters.queryset.items();
            commit('setInstances', instances);
        },
    },
};

const PAGE_WITH_INSTANCE = {
    state: {
        data: {
            instance: undefined,
        },
    },
    mutations: {
        setInstance(state, instance) {
            state.data.instance = instance;
        },
    },
};

const PAGE_STORE_MODULE = mergeDeep({}, PAGE_WITH_INSTANCE, {
    state: {
        data: {
            instance: undefined,
        },
    },
    actions: {
        async fetchData({ commit, dispatch }, { view, url, qs }) {
            commit('setQuerySet', { view, url, qs });

            return dispatch('updateData');
        },

        async updateData({ commit, getters }) {
            const instance = await getters.queryset.get();
            commit('setInstance', instance);
        },
    },
});

const PAGE_WITH_EDITABLE_DATA = mergeDeep({}, PAGE_WITH_INSTANCE, {
    state: {
        data: {
            sandbox: {},
        },
    },
    mutations: {
        setFieldValue(state, { field, value }) {
            Vue.set(state.data.sandbox, field, value);
        },

        setInstance(state, instance) {
            state.data.instance = instance;
            state.data.sandbox = instance.data;
        },
    },
});

const PAGE_NEW_STORE_MODULE = mergeDeep({}, PAGE_WITH_EDITABLE_DATA, {
    mutations: {
        setQuerySet(state, { view, url, qs }) {
            if (!qs) {
                let page_view = view;

                try {
                    page_view = app.views[view.schema.path.replace('/new', '')];
                } catch (e) {
                    console.log(e);
                }

                qs = page_view.objects.copy();
                qs.use_prefetch = true;
                qs.url = url.replace(/^\/|\/$/g, '');

                if (qs.model.name === view.objects.model.name) {
                    qs = qs.copy();
                } else {
                    qs = view.objects.clone({
                        use_prefetch: true,
                        url: url.replace(/^\/|\/$/g, ''),
                    });
                }
            }
            state.queryset = qs;
        },
    },
    actions: {
        // eslint-disable-next-line no-unused-vars
        async fetchData({ commit, getters }, { view, url, qs = undefined }) {
            commit('setQuerySet', { view, url, qs });

            const queryset = getters.queryset;
            const instance = queryset.model.getInstance({}, queryset);

            commit('setInstance', instance);
        },
    },
});

const PAGE_EDIT_STORE_MODULE = mergeDeep({}, PAGE_WITH_EDITABLE_DATA, {
    actions: {
        // eslint-disable-next-line no-unused-vars
        async fetchData({ commit, getters }, { view, url, qs = undefined }) {
            commit('setQuerySet', { view, url, qs });
            commit('setInstance', await getters.queryset.get());
        },
    },
});

const ACTION_STORE_MODULE = mergeDeep({}, PAGE_WITH_EDITABLE_DATA, {
    mutations: {
        setQuerySet(state, { view, url, qs }) {
            if (!qs) {
                qs = view.objects.clone({ url: url.replace(/^\/|\/$/g, '') });
            }
            state.queryset = qs;
        },
    },
    actions: {
        async fetchData({ commit, getters }, { view, url, qs = undefined }) {
            commit('setQuerySet', { view, url, qs });
            qs = getters.queryset;
            commit('setInstance', qs.model.getInstance({}, qs));
        },
    },
});

/**
 * View class - constructor, that returns view object.
 */
export default class View {
    /**
     * Constructor of View class.
     *
     * @param {object} model Model, with which this view is connected.
     * @param {object} schema Options of current view,
     * that include settings for a view (internal links, view type and so on).
     * @param mixins {Array.<Object>} Vue mixins for view component
     */
    constructor(model, schema, mixins = []) {
        let qs_constructor = this.constructor.getQuerySetConstructor(model);

        this.schema = schema;
        this.objects = new qs_constructor(model, this.schema.path, {}, schema.type === 'list');
        /**
         * Property, that stores extensions for components,
         * which would render current view.
         */
        this.mixins = mixins;
    }

    /**
     * Returns custom store module
     * @returns {Object|undefined}
     */
    getStoreModule() {
        switch (this.schema.type) {
            case 'list':
                return LIST_STORE_MODULE;
            case 'page':
                return PAGE_STORE_MODULE;
            case 'page_new':
                return PAGE_NEW_STORE_MODULE;
            case 'page_edit':
                return PAGE_EDIT_STORE_MODULE;
            case 'action':
                return ACTION_STORE_MODULE;
        }
    }

    /**
     * Method, that handles view buttons (actions, operations, sublinks, child_links)
     * and returns them.
     * @param {string} type Buttons type - actions / operations /sublinks / child_links.
     * @param {object} buttons Object with buttons options.
     * @param {object} instance Model instance connected with current view.
     */
    // eslint-disable-next-line no-unused-vars
    getViewSublinkButtons(type, buttons, instance) {
        return buttons;
    }

    /**
     * Method returns string with template of route path for current view.
     * @param {string} path View path.
     * @return {string}
     */
    getPathTemplateForRouter(path = '') {
        return path.replace(/{/g, ':').replace(/}/g, '');
    }

    /**
     * Method, that returns QuerySet constructor for view.
     * @param {object} model Model object.
     */
    static getQuerySetConstructor(model) {
        if (guiQuerySets[model.name + 'QuerySet']) {
            return guiQuerySets[model.name + 'QuerySet'];
        }

        return guiQuerySets.QuerySet;
    }
}
