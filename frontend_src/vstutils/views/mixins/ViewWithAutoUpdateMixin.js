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
    methods: {
        autoAutoUpdateActionName() {
            return `${this.storeName}/updateData`;
        },
        getAutoUpdateAction() {
            const actionName = this.autoAutoUpdateActionName();

            return typeof this[actionName] === 'function'
                ? { type: 'function', value: this[actionName] }
                : { type: 'storeAction', value: actionName };
        },
        startAutoUpdate() {
            this.$store.commit('autoupdate/subscribe', {
                action: this.getAutoUpdateAction(),
                autoupdateId: this.componentId,
            });
        },
        stopAutoUpdate() {
            this.$store.commit('autoupdate/unsubscribe', this.componentId);
        },
    },
};

export default ViewWithAutoUpdateMixin;
