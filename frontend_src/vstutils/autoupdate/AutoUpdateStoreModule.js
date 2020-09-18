import Vue from 'vue';

/**
 * Vuex store module needed for views auto update
 */
export default {
    namespaced: true,
    state: () => ({
        actionsToInvoke: [],
    }),
    mutations: {
        subscribe({ actionsToInvoke }, action) {
            if (action && actionsToInvoke.indexOf(action) === -1) {
                actionsToInvoke.push(action);
            }
        },

        unsubscribe({ actionsToInvoke }, action) {
            if (action) {
                const actionIndex = actionsToInvoke.indexOf(action);

                if (actionIndex !== -1) {
                    Vue.delete(actionsToInvoke, actionIndex);
                }
            }
        },
    },
};
