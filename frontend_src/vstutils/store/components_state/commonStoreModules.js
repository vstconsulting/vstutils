import Vue from 'vue';
import { mergeDeep, RequestTypes } from '../../utils';

export const LIST_STORE_MODULE = {
    state: {
        data: {
            filters: {},
            instances: null,
            selection: [],
            pagination: {
                count: 0,
                pageSize: 0, // Will be set to default page limit in ListViewComponent
                pageNumber: 1,
            },
        },
    },
    getters: {
        filters: (state) => state.data.filters,
        pagination: (state) => state.data.pagination,
        instances: (state) => state.data.instances,
        selection: (state) => state.data.selection,
        allSelected: (state) =>
            state.data.instances.every((instance) => state.data.selection.includes(instance.getPkValue())),
    },
    mutations: {
        setFilters(state, filters) {
            state.data.filters = filters;
            if (filters.limit) {
                state.data.pagination.pageSize = filters.limit;
            }
            state.queryset = state.queryset.clone({ query: filters });
        },

        setPageNumber(state, page) {
            state.data.pagination.pageNumber = page;
        },

        setSelection(state, selection) {
            state.data.selection = selection;
        },

        unselectIds(state, ids) {
            state.data.selection = state.data.selection.filter((id) => !ids.includes(id));
        },

        toggleSelection(state, instanceId) {
            const index = state.data.selection.indexOf(instanceId);
            if (index === -1) {
                state.data.selection.push(instanceId);
            } else {
                Vue.delete(state.data.selection, index);
            }
        },

        setInstances(state, instances) {
            state.data.instances = instances;
            if (instances.extra !== undefined && instances.extra['count'] !== undefined) {
                state.data.pagination.count = instances.extra['count'];
            }
            state.data.pagination.pageNumber = Number(state.data.filters['page']) || 1;
        },
    },
    actions: {
        toggleAllSelection({ getters, commit }) {
            const selection = getters.allSelected
                ? []
                : getters.instances.map((instance) => instance.getPkValue());

            commit('setSelection', selection);
        },

        async fetchData({ commit, dispatch }, { filters = undefined }) {
            if (filters) {
                commit('setFilters', filters);
            }

            return dispatch('updateData');
        },

        async updateData({ commit, getters }) {
            commit('setInstances', await getters.queryset.items());
        },
    },
};

export const PAGE_WITH_INSTANCE = {
    state: {
        data: {
            instance: undefined,
            sandbox: {},
        },
    },

    getters: {
        instance: (state) => state.data.instance,
        sandbox: (state) => state.data.sandbox,
    },
    mutations: {
        setInstance(state, instance) {
            state.data.instance = instance;
            state.data.sandbox = instance._getRepresentData();
        },
    },
};

export const PAGE_STORE_MODULE = mergeDeep({}, PAGE_WITH_INSTANCE, {
    actions: {
        async fetchData({ dispatch }, instanceId) {
            return dispatch('updateData', instanceId);
        },

        async updateData({ commit, getters }, instanceId = undefined) {
            const instance = await getters.queryset.get(instanceId || getters.instance?.getPkValue());
            commit('setInstance', instance);
        },
    },
});

export const PAGE_WITH_EDITABLE_DATA = mergeDeep({}, PAGE_WITH_INSTANCE, {
    mutations: {
        setFieldValue(state, { field, value }) {
            Vue.set(state.data.sandbox, field, value);
        },
        validateAndSetInstanceData(state, { instance, data } = {}) {
            instance = instance || state.data.instance;
            instance._validateAndSetData(data || state.data.sandbox);
        },
    },
});

export const PAGE_NEW_STORE_MODULE = mergeDeep({}, PAGE_WITH_EDITABLE_DATA, {
    actions: {
        async fetchData({ commit, getters }, { data } = {}) {
            const queryset = getters.queryset;
            const model = queryset.getRequestModelClass(RequestTypes.CREATE);
            commit('setInstance', new model(model.getInitialData(data), queryset));
        },
    },
});

export const PAGE_EDIT_STORE_MODULE = mergeDeep({}, PAGE_WITH_EDITABLE_DATA, {
    mutations: {
        setInstance(state, instance) {
            const model =
                state.queryset.getRequestModelClass(RequestTypes.PARTIAL_UPDATE) ||
                state.queryset.getRequestModelClass(RequestTypes.UPDATE);

            if (!(instance instanceof model)) {
                instance = new model(null, null, instance);
            }

            PAGE_WITH_INSTANCE.mutations.setInstance(state, instance);
        },
    },
    actions: {
        async fetchData({ commit, getters }, instanceId) {
            commit('setInstance', await getters.queryset.get(instanceId));
        },
        async reloadInstance({ dispatch, getters }) {
            return dispatch('fetchData', getters.instance.getPkValue());
        },
    },
});

export const ACTION_STORE_MODULE = mergeDeep({}, PAGE_WITH_EDITABLE_DATA);
