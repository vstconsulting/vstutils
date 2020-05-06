<template>
    <div :class="wrapper_classes" v-if="item.active">
        <div class="card card-info">
            <div class="card-header card-header_widget ui-sortable-handle cursor-move1">
                {{ $t((item.title || item.name).toLowerCase()) | capitalize }}
                <button
                    type="button"
                    class="btn btn-card-tool btn-sm btn-light btn-icon btn-right"
                    @click="toggleCollapse"
                    aria-label="toggle"
                >
                    <i class="fa" :class="item.collapse ? 'fa-plus' : 'fa-minus'"></i>
                </button>
                <content_header :item="item" :value="value" v-if="with_content_header"></content_header>
            </div>
            <transition name="fade">
                <div class="card-body border-radius-none" v-if="!item.collapse">
                    <content_body :item="item" :value="value"></content_body>
                </div>
            </transition>
        </div>
    </div>
</template>

<script>
    import { BaseWidgetMixin, CardWidgetBodyMixin } from './baseWidgetMixins.js';

    /**
     * Base mixin for 'card widget' components.
     */
    export default {
        name: 'card_widget_mixin',
        mixins: [BaseWidgetMixin],
        data() {
            return {
                /**
                 * Property, that means use child content_header component or not.
                 */
                with_content_header: false,
            };
        },
        computed: {
            /**
             * CSS classes of widget DOM element's wrapper.
             */
            wrapper_classes() {
                return ['col-lg-12', 'col-12', 'dnd-block'];
            },
        },
        methods: {
            /**
             * Method, that toggles item.collapse value to opposite.
             */
            toggleCollapse() {
                this.item.collapse = !this.item.collapse;
            },
            /**
             * Method, that toggles item.active value to opposite.
             */
            toggleActive() {
                this.item.active = !this.item.active;
            },
        },
        components: {
            /**
             * Component, that is responsible for rendering of widgets body content.
             */
            content_body: {
                mixins: [CardWidgetBodyMixin],
            },
        },
    };
</script>

<style scoped></style>
