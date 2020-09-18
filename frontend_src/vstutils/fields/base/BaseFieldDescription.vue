<template>
    <div :class="classes" :style="styles">{{ description }}</div>
</template>

<script>
    /**
     * Mixin for gui_field description component.
     */
    import BaseFieldInnerComponentMixin from './BaseFieldInnerComponentMixin.js';

    export default {
        name: 'BaseFieldDescription',
        mixins: [BaseFieldInnerComponentMixin],
        data() {
            return {
                class_list: ['help-block'],
            };
        },
        computed: {
            description() {
                return this.$t(
                    (this.field.options.description || this.field.options.help || '').toLowerCase(),
                );
            },
        },
    };
</script>

<style scoped></style>
