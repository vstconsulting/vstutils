<template>
    <label :id="label_id" :class="classes" :style="styles">
        {{ label }}
        <Popover :content="field.description" />
    </label>
</template>

<script>
    import Popover from '../../components/Popover.vue';
    import BaseFieldInnerComponentMixin from './BaseFieldInnerComponentMixin.js';
    import FieldLabelIdMixin from '../FieldLabelIdMixin.js';

    /**
     * Mixin for gui_field label component.
     */
    export default {
        name: 'BaseFieldLabel',
        components: { Popover },
        mixins: [BaseFieldInnerComponentMixin, FieldLabelIdMixin],
        data() {
            return {
                class_list: ['control-label'],
            };
        },
        computed: {
            label() {
                return this.$t(this.field.title);
            },
        },
    };
</script>
