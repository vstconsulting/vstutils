/**
 * Mixin for views, that are able to send autoupdate requests.
 *
 * @vue/component
 */
import ComponentIDMixin from '../../ComponentIDMixin.js';

const ViewWithAutoUpdateMixin = {
    mixins: [ComponentIDMixin],
    beforeRouteUpdate(to, from, next) {
        this.stopAutoUpdate();
        next();
    },
    beforeDestroy() {
        this.stopAutoUpdate();
    },
    computed: {
        autoUpdatePK() {},
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
            return typeof this[actionName] === 'function'
                ? { ...action, type: 'function', value: this[actionName] }
                : { ...action, type: 'storeAction', value: actionName };
        },
        startAutoUpdate() {
            this.$store.commit('autoupdate/subscribe', this.getAutoUpdateAction());
        },
        stopAutoUpdate() {
            this.$store.commit('autoupdate/unsubscribe', this.componentId);
        },
    },
};

export default ViewWithAutoUpdateMixin;
