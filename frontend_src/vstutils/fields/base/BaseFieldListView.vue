<template>
    <span>
        <span v-if="prependText" v-text="$t(prependText) + ' '" />
        {{ preparedValue }}
        <span v-if="appendText" v-text="' ' + $t(appendText)" />
    </span>
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
                if (this.value === undefined || this.value === null) {
                    return '';
                }
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
