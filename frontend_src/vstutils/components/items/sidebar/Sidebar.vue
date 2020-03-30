<template>
    <div class="sidebar">
        <nav class="mt-2">
            <ul class="nav nav-pills nav-sidebar flex-column">
                <template v-for="item in menu_items">
                    <sidebar_link_wrapper :item="item" @hideSidebar="hideSidebar" />
                </template>
            </ul>
        </nav>
    </div>
</template>

<script>
    export default {
        name: 'sidebar',
        props: {
            menu: Array,
            docs: Object,
            /**
             * Property, that means what type of links to use:
             *  - true - <a></a>,
             *  - false - <router-link></router-link>.
             */
            a_links: {
                default: false,
            },
        },
        computed: {
            /**
             * Property, that returns menu items, that should be rendered.
             */
            menu_items() {
                let url_prefix = '';
                if (this.a_links) {
                    url_prefix = app.api.getHostUrl();
                }

                let items = [
                    {
                        name: 'Home',
                        url: url_prefix + '/',
                        span_class: 'fas fa-tachometer-alt',
                        origin_link: this.a_links,
                    },
                ];

                items = items.concat(this.menu || []);

                if (this.docs && this.docs.has_docs && this.docs.docs_url) {
                    items.push({
                        name: 'Documentation',
                        url: this.docs.docs_url,
                        span_class: 'fa fa-book',
                        origin_link: true,
                    });
                }

                return items;
            },
        },
        methods: {
            /**
             * Method, that hides sidebar.
             */
            hideSidebar() {
                if (window.innerWidth <= 991) {
                    $('body').removeClass('sidebar-open');
                    $('body').addClass('sidebar-collapse');
                }
            },
        },
    };
</script>

<style scoped></style>
