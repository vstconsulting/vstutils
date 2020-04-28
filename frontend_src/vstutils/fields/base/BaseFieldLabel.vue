<template>
    <label :id="label_id" :class="classes" :style="styles">{{ label | capitalize | split }}</label>
</template>

<script>
    import BaseFieldInnerComponentMixin from './BaseFieldInnerComponentMixin.js';
    import FieldLabelIdMixin from '../FieldLabelIdMixin.js';

    /**
     * Mixin for gui_field label component.
     */
    export default {
        name: 'BaseFieldLabel',
        mixins: [BaseFieldInnerComponentMixin, FieldLabelIdMixin],
        data() {
            return {
                class_list: ['control-label'],
            };
        },
        computed: {
            label() {
                return this.$t((this.field.options.title || this.field.options.name).toLowerCase());
            },
        },
    };
</script>

<style scoped></style>
