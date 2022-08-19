<template>
    <component
        :is="link.tag"
        class="nav-link"
        v-bind="link.props"
        style="cursor: pointer"
        @click="onLinkClickHandler"
    >
        <i class="nav-icon ico-menu" :class="icon_classes" />
        <p>
            <span class="li-header-span">
                <i class="li-header-span-i-none menu-text-data">
                    {{ $st(item.name) }}
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
            link() {
                if (this.item.origin_link || !this.item.url) {
                    const link = {
                        tag: 'a',
                        props: {},
                    };
                    if (this.link_url) {
                        link.props.href = this.link_url;
                    }
                    return link;
                }
                if (this.item.emptyAction) {
                    return { tag: 'a' };
                }

                return {
                    tag: 'router-link',
                    props: { to: this.link_url, exact: true, activeClass: 'active' },
                };
            },
            /**
             * Property, that returns icon classes for current sidebar_link.
             */
            icon_classes() {
                return this.item.span_class;
            },
            /**
             * Property, that returns sidebar_link url to represent.
             */
            link_url() {
                return this.item.url || '';
            },
        },
        methods: {
            /**
             * Method - handler for sidebar_link click event.
             */
            onLinkClickHandler() {
                if (this.item.emptyAction) {
                    this.$app.actions.executeEmpty({ action: this.item.emptyAction });
                }
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
