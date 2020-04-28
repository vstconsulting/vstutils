<template>
    <div :class="classes" :style="styles">{{ value }}</div>
</template>

<script>
    import BaseFieldInnerComponentMixin from './BaseFieldInnerComponentMixin.js';

    /**
     * Mixin for gui_field list_view component.
     */
    export default {
        mixins: [BaseFieldInnerComponentMixin],
        data() {
            return {
                styles_dict: { display: 'contents' },
            };
        },
    };
</script>

<style scoped></style>
