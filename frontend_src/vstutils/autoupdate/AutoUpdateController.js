import Visibility from 'visibilityjs';
import { guiLocalSettings, randomSleep } from '../utils';

/**
 * @typedef {Object} AutoUpdateAction
 * @property {string} autoupdateId
 * @property {string} type
 * @property {string} triggerType
 * @property {*} value
 * @property {Array<string>} [subscriptions]
 * @property {*} [pk]
 */

/**
 * Mixin for AppRoot to control auto updating of views
 *
 * @vue/component
 */
export default {
    data() {
        return {
            autoupdate: {
                timeoutId: null,
                stop: false,
                centrifugoSubscription: null,

                bulkedActionsDelay: 1000,
                bulkedActions: [],
                bulkedActionsTimeout: null,
            },
        };
    },
    created() {
        if (this.$app.centrifugoClient) {
            this.centrifugoSubscription = this.$app.centrifugoClient.subscribe(
                'subscriptions_update',
                (message) => this.onCentrifugoUpdate(message.data),
            );
        }
        this.startAutoUpdate();
    },
    destroyed() {
        this.stopAutoUpdate();
        if (this.centrifugoSubscription) {
            this.centrifugoSubscription.unsubscribe();
            this.centrifugoSubscription.removeAllListeners();
        }
    },
    methods: {
        startAutoUpdate() {
            this.autoupdate.stop = false;

            if (this.autoupdate.timeoutId) {
                clearTimeout(this.autoupdate.timeoutId);
            }

            this.autoupdate.timeoutId = setTimeout(async () => {
                if (Visibility.state() !== 'hidden') {
                    try {
                        await this.updateData();
                    } catch (error) {
                        console.warn(error);
                    }
                }

                if (!this.autoupdate.stop) {
                    this.startAutoUpdate();
                }
            }, this.getAutoUpdateInterval());
        },
        stopAutoUpdate() {
            this.autoupdate.stop = true;
            clearTimeout(this.autoupdate.timeoutId);
        },
        invokeSubscriber(action) {
            try {
                if (action.type === 'function') {
                    return action.value();
                } else if (action.type === 'storeAction') {
                    return this.$store.dispatch(action.value);
                } else {
                    console.warn('Unknown action type: ' + action.type);
                }
                // eslint-disable-next-line no-empty
            } catch (error) {}
        },
        bulkInvoke(action) {
            if (!this.autoupdate.bulkedActions.includes(action)) {
                this.autoupdate.bulkedActions.push(action);

                if (!this.autoupdate.bulkedActionsTimeout) {
                    this.autoupdate.bulkedActionsTimeout = setTimeout(() => {
                        // Add random delay up to 1 second to avoid massive simultaneous requests from clients
                        randomSleep(1, 1000).then(() => {
                            const actionsCopy = this.autoupdate.bulkedActions.slice();
                            this.autoupdate.bulkedActionsTimeout = null;
                            this.autoupdate.bulkedActions = [];
                            actionsCopy.map((action) => this.invokeSubscriber(action));
                        });
                    }, this.autoupdate.bulkedActionsDelay);
                }
            }
        },

        // Timer updates

        getAutoUpdateInterval() {
            return guiLocalSettings.get('page_update_interval') || 5000;
        },
        updateData() {
            const promises = [];
            for (const action of this.$store.state.autoupdate.timerSubscribers.values()) {
                promises.push(this.invokeSubscriber(action));
            }
            return Promise.all(promises);
        },

        // Centrifugo updates

        onCentrifugoUpdate({ pk, 'subscribe-label': label }) {
            if (!this.$store.state.autoupdate.centrifugoSubscriptions.has(label)) {
                return;
            }
            return this.$store.state.autoupdate.centrifugoSubscriptions
                .get(label)
                .filter((action) => !action.pk || String(action.pk) === String(pk))
                .map((action) => this.bulkInvoke(action));
        },
    },
};
