<template>
    <li class="nav-item" :class="wrapper_classes" :data-url="item.url" @click="hideSidebar">
        <sidebar_link :item="item" @toggleMenuOpen="toggleMenuOpen" @hideSidebar="hideSidebar" />
        <template v-if="item.sublinks">
            <ul class="menu-treeview-menu nav nav-treeview">
                <template v-for="(subitem, idx) in item.sublinks">
                    <li :key="idx" class="nav-item" :data-url="subitem.url">
                        <sidebar_link :item="subitem" @hideSidebar="hideSidebar" />
                    </li>
                </template>
            </ul>
        </template>
    </li>
</template>

<script>
    import { SidebarLinkMixin } from '../../mixins';

    export default {
        name: 'sidebar_link_wrapper',
        mixins: [SidebarLinkMixin],
        props: ['item'],
        data() {
            return {
                /**
                 * Property, that is responsible for showing/hiding of submenu.
                 */
                menu_open: false,
            };
        },
        watch: {
            page_url: function (path) {
                if (!this.are_sublinks_active && this.menu_open) {
                    this.menu_open = false;
                }
            },
            are_sublinks_active: function (val) {
                this.menu_open = val;
            },
            is_item_active: function (val) {
                if (!this.are_sublinks_active) {
                    this.menu_open = val;
                }
            },
        },
        created() {
            this.menu_open = this.are_sublinks_active || this.is_item_active;
        },
        computed: {
            /**
             * Property, that returns classes for sidebar_link wrapper.
             */
            wrapper_classes() {
                let classes = '';

                if (this.item.sublinks) {
                    classes += 'menu-treeview has-treeview ';
                }

                if (this.menu_open) {
                    classes += 'menu-open ';
                }

                return classes;
            },
            /**
             * Boolean property, that means: is there any active sublink.
             */
            are_sublinks_active() {
                if (!this.item.sublinks) {
                    return false;
                }

                for (let index = 0; index < this.item.sublinks.length; index++) {
                    let sublink = this.item.sublinks[index];

                    if (this.is_link_active(sublink, this.page_url)) {
                        return true;
                    }
                }

                return false;
            },
            /**
             * Boolean property, that means active current sidebar_link or not.
             */
            is_item_active() {
                return this.is_link_active(this.item, this.page_url);
            },
        },
        methods: {
            /**
             * Method, that shows/hides submenu.
             */
            toggleMenuOpen() {
                this.menu_open = !this.menu_open;
            },
            /**
             * Method, that calls parent's 'hideSidebar' method.
             */
            hideSidebar() {
                this.$emit('hideSidebar');
            },
        },
    };
</script>

<style scoped></style>
