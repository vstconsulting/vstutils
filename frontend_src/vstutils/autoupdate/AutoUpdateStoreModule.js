/**
 * Vuex store module needed for views auto update
 */
export default {
    namespaced: true,
    state: () => ({
        timerSubscribers: new Map(),

        centrifugoSubscribers: new Map(),
        centrifugoSubscriptions: new Map(),
    }),
    mutations: {
        /**
         * @param {Object} state
         * @param {AutoUpdateAction} action
         */
        subscribe(state, action) {
            const autoupdateId = action.autoupdateId;

            if (action.triggerType === 'timer') {
                state.timerSubscribers.set(autoupdateId, action);
            } else if (action.triggerType === 'centrifugo') {
                state.centrifugoSubscribers.set(autoupdateId, action);
                for (const subscription of action.subscriptions) {
                    if (!state.centrifugoSubscriptions.has(subscription)) {
                        state.centrifugoSubscriptions.set(subscription, []);
                    }
                    state.centrifugoSubscriptions.get(subscription).push(action);
                }
            } else {
                throw new Error(`Unknown trigger type: ${action.triggerType}`);
            }
        },

        unsubscribe(state, autoupdateId) {
            // Timer subscription
            if (state.timerSubscribers.has(autoupdateId)) {
                state.timerSubscribers.delete(autoupdateId);
                return;
            }

            // Centrifugo subscription
            if (state.centrifugoSubscribers.has(autoupdateId)) {
                const action = state.centrifugoSubscribers.get(autoupdateId);
                state.centrifugoSubscribers.delete(autoupdateId);
                for (const subscription of action.subscriptions) {
                    const subscribers = state.centrifugoSubscriptions.get(subscription);
                    subscribers.splice(
                        subscribers.findIndex((action) => autoupdateId === action.autoupdateId),
                        1,
                    );
                    if (subscribers.length === 0) {
                        state.centrifugoSubscriptions.delete(subscription);
                    }
                }
            }
        },
    },
};
