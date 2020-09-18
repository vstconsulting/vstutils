/**
 * Mixin for views, that are able to send autoupdate requests.
 *
 * @vue/component
 */
const ViewWithAutoUpdateMixin = {
    beforeRouteUpdate(to, from, next) {
        this.stopAutoUpdate();
        next();
    },
    computed: {
        autoUpdateActionName() {
            return `${this.storeName}/updateData`;
        },
    },
    beforeDestroy() {
        this.stopAutoUpdate();
    },
    methods: {
        startAutoUpdate() {
            this.$store.commit('autoupdate/subscribe', this.autoUpdateActionName);
        },
        stopAutoUpdate() {
            this.$store.commit('autoupdate/unsubscribe', this.autoUpdateActionName);
        },
    },
};

export default ViewWithAutoUpdateMixin;
