/**
 * Mixin for views, that are able to send autoupdate requests.
 *
 * @vue/component
 */
const ViewWithAutoUpdateMixin = {
    data() {
        return {
            autoupdateQsUrl: null,
        };
    },
    computed: {
        lastAutoUpdate() {
            return this.$store.state.autoupdate.lastUpdate;
        },
    },
    watch: {
        lastAutoUpdate() {
            this.updateData();
        },
    },
    beforeRouteUpdate(to, from, next) {
        this.stopAutoUpdate();
        next();
    },
    beforeDestroy() {
        this.stopAutoUpdate();
    },
    methods: {
        startAutoUpdate() {
            this.autoupdateQsUrl = this.qs_url;
            this.$store.commit('autoupdate/subscribe', {
                queryset: this.autoupdateQsUrl,
                subscriberID: this.componentId,
            });
        },
        stopAutoUpdate() {
            this.$store.commit('autoupdate/unsubscribe', {
                queryset: this.autoupdateQsUrl,
                subscriberID: this.componentId,
            });
        },
    },
};

export default ViewWithAutoUpdateMixin;
