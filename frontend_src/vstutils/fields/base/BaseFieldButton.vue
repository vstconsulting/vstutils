<template>
    <div
        :class="wrapper_classes"
        :style="wrapper_styles"
        @click="eventHandler"
        data-toggle="tooltip"
        :title="help_text"
    >
        <span :class="span_classes" :style="span_styles">
            <span :class="icon_classes" :style="icon_styles"></span>
        </span>
    </div>
</template>

<script>
    /**
     * Mixin for field buttons (cleanValue, defaultValue, hideField).
     * Mixin - extension for several Vue components with common data/methods/props/template and so on.
     */
    export default {
        props: ['field'],
        data() {
            return {
                wrapper_classes: ['input-group-append'],
                wrapper_styles: {},
                span_classes: ['input-group-text'],
                span_styles: { cursor: 'pointer' },
                icon_classes: ['fa', 'fa-times'],
                icon_styles: {},
                help_text: 'Clean value',
                event_handler: 'cleanValue',
            };
        },
        methods: {
            eventHandler(e) {
                this.$emit(this.event_handler, e);
            },
        },
    };
</script>

<style scoped></style>
