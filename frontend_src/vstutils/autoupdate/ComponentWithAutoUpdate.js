import ComponentIDMixin from '../ComponentIDMixin.js';

export default {
    mixins: [ComponentIDMixin],
    computed: {
        autoUpdatePK() {
            if (typeof this.getInstancePk === 'function') {
                return this.getInstancePk();
            }
        },
        autoupdateSubscriptionLabels() {
            return this.view?.subscriptionLabels || [];
        },
        autoupdateTriggerType() {
            if (this.$app.centrifugoClient?.isConnected() && this.autoupdateSubscriptionLabels) {
                return 'centrifugo';
            }
            return 'timer';
        },
    },
    beforeDestroy() {
        this.stopAutoUpdate();
    },
    methods: {
        autoAutoUpdateActionName() {
            return `${this.storeName}/updateData`;
        },
        getAutoUpdateAction() {
            const actionName = this.autoAutoUpdateActionName();
            const action = {
                autoupdateId: this.componentId,
                triggerType: this.autoupdateTriggerType,
                subscriptions: this.autoupdateSubscriptionLabels,
                pk: this.autoUpdatePK,
            };
            if (typeof this[actionName] === 'function') {
                action.type = 'function';
                action.value = this[actionName];
            } else {
                action.type = 'storeAction';
                action.value = actionName;
            }
            return action;
        },
        startAutoUpdate() {
            this.$store.commit('autoupdate/subscribe', this.getAutoUpdateAction());
        },
        stopAutoUpdate() {
            this.$store.commit('autoupdate/unsubscribe', this.componentId);
        },
    },
};
