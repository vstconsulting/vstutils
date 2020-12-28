/**
 * Mixin for sidebar_link and sidebar_link_wrapper components.
 */
const SidebarLinkMixin = {
    name: 'sidebar_link_mixin',
    computed: {
        /**
         * Property, that returns url of current page.
         */
        page_url() {
            if (this.$route && this.$route.path) {
                return this.$route.path;
            } else {
                return window.location.hash;
            }
        },
    },
    methods: {
        is_link_active(item, url) {
            if (item.url == url) {
                return true;
            }

            if (url == '/') {
                return false;
            }

            let instance = url.split('/')[1];

            if (!instance) {
                return false;
            }
        },
    },
};

export default SidebarLinkMixin;
