/**
 * @vue/component
 */
export default {
    computed: {
        title() {
            return this.$t(this.view.title);
        },
    },
};
