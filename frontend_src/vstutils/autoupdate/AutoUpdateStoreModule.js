/**
 * Vuex store module needed for views auto update
 */
export default {
    namespaced: true,
    state: () => ({
        actionsToInvoke: new Map(),
    }),
    mutations: {
        subscribe({ actionsToInvoke }, { action, autoupdateId }) {
            if (!actionsToInvoke.has(autoupdateId)) {
                actionsToInvoke.set(autoupdateId, action);
            }
        },

        unsubscribe({ actionsToInvoke }, autoupdateId) {
            actionsToInvoke.delete(autoupdateId);
        },
    },
};
