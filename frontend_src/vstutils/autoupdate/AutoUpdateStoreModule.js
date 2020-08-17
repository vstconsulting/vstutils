import Vue from 'vue';

/**
 * Vuex store module needed for views auto update
 */
export default {
    namespaced: true,
    state: () => ({
        querysets: {},
        lastUpdate: -1,
    }),
    mutations: {
        subscribe({ querysets }, { queryset, subscriberID }) {
            if (!queryset) {
                return;
            }

            if (querysets[queryset] && querysets[queryset].indexOf(subscriberID) !== -1) {
                return;
            }
            if (!querysets[queryset]) {
                Vue.set(querysets, queryset, []);
            }
            querysets[queryset].push(subscriberID);
        },

        unsubscribe({ querysets }, { queryset, subscriberID }) {
            if (!queryset) {
                return;
            }

            if (querysets[queryset]) {
                const subscriberIndex = querysets[queryset].indexOf(subscriberID);
                if (subscriberIndex !== -1) {
                    querysets[queryset].splice(subscriberIndex, 1);
                }
            }

            if (querysets[queryset] && querysets[queryset].length === 0) {
                Vue.delete(querysets, queryset);
            }
        },

        updateDate(state) {
            state.lastUpdate = Date.now();
        },
    },
};
