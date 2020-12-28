export default {
    namespaced: true,
    state: {
        queryset: undefined,
        data: {
            parent_instances: {},
        },
    },
    getters: {
        queryset: (state) => {
            return state.queryset;
        },
        data: (state) => {
            return state.data;
        },
    },
    mutations: {
        setQuerySet(state, qs) {
            state.queryset = qs;
        },
        setData(state, value) {
            state.data = value;
        },
        setParentInstances(state, parentInstances) {
            state.data.parent_instances = parentInstances;
        },
    },
    actions: {
        // eslint-disable-next-line no-unused-vars
        async fetchData(obj) {},

        // eslint-disable-next-line no-unused-vars
        async updateData(obj) {},
    },
};
