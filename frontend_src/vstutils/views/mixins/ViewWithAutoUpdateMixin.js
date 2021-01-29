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
    },
    methods: {
        autoAutoUpdateActionName() {
            return `${this.storeName}/updateData`;
        },
        getAutoUpdateAction() {
            const actionName = this.autoAutoUpdateActionName();
            const action = {
                autoupdateId: this.componentId,
                triggerType: this.$app.centrifugoClient?.isConnected() ? 'centrifugo' : 'timer',
                subscriptions: this.view.subscriptionLabels,
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
