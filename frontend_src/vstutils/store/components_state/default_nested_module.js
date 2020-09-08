import { mergeDeep } from '../../utils'

export default {
    namespaced: true,
    state: {
        qs_url: '',
        data: {},
    },
    getters: {
        queryset: (state, getters, rootState, rootGetters) => {
            return rootGetters.getQuerySet(state.qs_url) || null;
        },
        data: (state) => {
            return state.data;
        },
        filters: (state) => {
            return state.data.filters;
        },
    },
    mutations: {
        setQuerySet(state, { view, url, qs }) {
            if (!qs) {
                qs = view.objects.copy({ url: url.replace(/^\/|\/$/g, '') }).prefetch(true);
            }
            Vue.set(state, 'qs_url', qs.url);
            this.commit('setQuerySet', { queryset: qs }, { root: true });
        },
        setData(state, { value }) {
            state.data = mergeDeep(state.data, value);
        },
        setFilters(state, { filters, url }) {
            Vue.set(state.data, 'filters', filters);
            if (url) {
                url = url.replace(/^\/|\/$/g, '');
                this.commit('setFilters', { filters, url }, { root: true });
            }
        },
        setInstances(state, { instances }) {
            Vue.set(state.data, 'instances', instances);
            Vue.set(state.data.pagination, 'count', instances.extra['count']);
            Vue.set(state.data.pagination, 'page_number', state.data.filters['page'] || 1);
        },
        setInstance(state, { instance }) {
            Vue.set(state.data, 'instance', instance);
        },
    },
    actions: {
        async fetchData(context, { view, url, qs, filters, many }) {
            if (filters) {
                context.commit('setFilters', { filters });
            }

            context.commit('setQuerySet', { view, url, qs });

            if ( qs === undefined ) {
                qs = context.getters.queryset
                    .filter({...context.state.data.filters})
                    .prefetch();
            }
            context.commit('setQuerySet', { view, url, qs });

            if(many) {
                return context.getters.queryset.items().then(
                    (instances) => {
                        context.commit('setInstances', { instances });
                        return instances;
                    }
                )
            } else {
                return context.getters.queryset.get()
                    .then((instance) => {
                        debugger;
                        context.commit('setInstance', { instance });
                        return instance;
                    })
            }
        },
    },
}
