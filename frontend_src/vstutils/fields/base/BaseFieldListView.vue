<template>
    <span v-text="preparedValue" />
</template>

<script>
    import BaseFieldInnerComponentMixin from './BaseFieldInnerComponentMixin.js';

    /**
     * Mixin for gui_field list_view component.
     */
    export default {
        name: 'BaseFieldListView',
        mixins: [BaseFieldInnerComponentMixin],
        computed: {
            preparedValue() {
                return this.value;
            },
        },
    };
</script>

<style>
    .field-component.type-list {
        margin-bottom: 0;

        /* Truncate text */
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
