import { mergeDeep } from '../../utils';
import Vue from 'vue';

export const LIST_STORE_MODULE = {
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

export const PAGE_WITH_INSTANCE = {
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

export const PAGE_STORE_MODULE = mergeDeep({}, PAGE_WITH_INSTANCE, {
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

export const PAGE_WITH_EDITABLE_DATA = mergeDeep({}, PAGE_WITH_INSTANCE, {
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

export const PAGE_NEW_STORE_MODULE = mergeDeep({}, PAGE_WITH_EDITABLE_DATA, {
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

export const PAGE_EDIT_STORE_MODULE = mergeDeep({}, PAGE_WITH_EDITABLE_DATA, {
    actions: {
        // eslint-disable-next-line no-unused-vars
        async fetchData({ commit, getters }, { view, url, qs = undefined }) {
            commit('setQuerySet', { view, url, qs });
            commit('setInstance', await getters.queryset.get());
        },
    },
});

export const ACTION_STORE_MODULE = mergeDeep({}, PAGE_WITH_EDITABLE_DATA, {
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
