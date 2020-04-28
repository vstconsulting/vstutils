<template>
    <div class="input-group">
        <input
            :type="input_type"
            :class="classes"
            :style="styles"
            :value="value"
            disabled
            :aria-labelledby="label_id"
            :aria-label="aria_label"
        />
    </div>
</template>

<script>
    import BaseFieldContentMixin from './BaseFieldContentMixin.js';
    import BaseFieldInnerComponentMixin from './BaseFieldInnerComponentMixin.js';
    import FieldLabelIdMixin from '../FieldLabelIdMixin.js';

    /**
     * Mixin for readOnly gui_fields' content(input value area).
     */
    export default {
        name: 'BaseFieldContentReadonlyMixin',
        mixins: [BaseFieldContentMixin, BaseFieldInnerComponentMixin, FieldLabelIdMixin],
        data() {
            return {
                class_list: ['form-control'],
            };
        },
    };
</script>

<style scoped></style>
