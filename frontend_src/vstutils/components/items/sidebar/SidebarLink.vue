<template>
    <component
        :is="link_type"
        :[link_url_attr]="link_url"
        class="nav-link"
        :class="link_classes"
        rel="noreferrer"
        @click="onLinkClickHandler"
    >
        <i class="nav-icon ico-menu" :class="icon_classes" />
        <p>
            <span class="li-header-span">
                <i class="li-header-span-i-none menu-text-data">
                    {{ $u.capitalize($t(item.name.toLowerCase())) }}
                </i>
            </span>
            <template v-if="item.sublinks">
                <i class="right fa fa-angle-left ico-menu" @click.stop.prevent="onToggleIconClickHandler" />
            </template>
        </p>
    </component>
</template>

<script>
    import { SidebarLinkMixin } from '../../mixins';

    export default {
        // eslint-disable-next-line vue/component-definition-name-casing
        name: 'sidebar_link',
        mixins: [SidebarLinkMixin],
        props: { item: { type: Object, required: true } },
        computed: {
            /**
             * Property, that returns icon classes for current sidebar_link.
             */
            icon_classes() {
                return this.item.span_class;
            },
            /**
             * Property, that returns classes for current sidebar_link.
             */
            link_classes() {
                if (this.is_link_active(this.item, this.page_url)) {
                    return 'active';
                }

                return '';
            },
            /**
             * Property, that returns type of current sidebar_link: <router-link></router-link> or <a></a>.
             */
            link_type() {
                if (this.item.origin_link || !this.item.url) {
                    return 'a';
                }

                return 'router-link';
            },
            /**
             * Property, that returns sidebar_link url to represent.
             */
            link_url() {
                return this.item.url || '';
            },
            /**
             * Property, that returns name of attribute for storing sidebar_link url.
             */
            link_url_attr() {
                if (this.link_type == 'a' && this.item.url) {
                    return 'href';
                }

                return 'to';
            },
        },
        methods: {
            /**
             * Method - handler for sidebar_link click event.
             */
            onLinkClickHandler() {
                if (this.item.url) {
                    return this.$emit('hideSidebar');
                } else {
                    if (this.item.sublinks) {
                        return this.onToggleIconClickHandler();
                    }
                }
            },
            /**
             * Method - handler for sidebar_link toggle icon click event.
             */
            onToggleIconClickHandler() {
                return this.$emit('toggleMenuOpen');
            },
        },
    };
</script>
