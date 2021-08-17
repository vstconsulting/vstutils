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

    const hasTouchScreen = 'ontouchstart' in window || navigator.msMaxTouchPoints;

    export default {
        name: 'Sidebar',
        props: {
            menu: { type: Array, required: true },
            docs: { type: Object, required: true },
        },
        computed: {
            /**
             * Property, that returns menu items, that should be rendered.
             */
            menu_items() {
                let items = [
                    {
                        name: 'Home',
                        url: '/',
                        span_class: 'fas fa-tachometer-alt',
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
            if (hasTouchScreen) {
                $('body').swipe({
                    swipe: (event, direction) => {
                        if (direction === 'right') {
                            this.openSidebar();
                        } else if (direction === 'left') {
                            this.hideSidebar();
                        }
                        return true;
                    },
                    threshold: 150,
                    preventDefaultEvents: false,
                });
            }
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
