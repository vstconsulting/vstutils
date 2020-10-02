<template>
    <div class="sidebar">
        <nav class="mt-2">
            <ul class="nav nav-pills nav-sidebar flex-column">
                <template v-for="(item, idx) in menu_items">
                    <sidebar_link_wrapper :key="idx" :item="item" @hideSidebar="hideSidebar" />
                </template>
            </ul>
        </nav>
    </div>
</template>

<script>
    import $ from 'jquery';

    export default {
        name: 'Sidebar',
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
        mounted() {
            $('body').swipe({
                swipe: (event, direction) => {
                    if (direction === 'right') {
                        this.openSidebar();
                    } else if (direction === 'left') {
                        this.hideSidebar();
                    }
                    return true;
                },
                threshold: 90,
                preventDefaultEvents: false,
            });
        },
        methods: {
            /**
             * Method, that hides sidebar.
             */
            hideSidebar() {
                if (document.body.classList.contains('sidebar-open')) {
                    $('[data-widget="pushmenu"]').PushMenu('collapse');
                }
            },
            /**
             * Method, that hides sidebar.
             */
            openSidebar() {
                $('[data-widget="pushmenu"]').PushMenu('expand');
            },
        },
    };
</script>

<style scoped></style>
