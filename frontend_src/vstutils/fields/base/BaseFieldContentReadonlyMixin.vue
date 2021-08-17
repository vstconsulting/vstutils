<template>
    <p :aria-label="aria_label" :aria-labelledby="label_id">
        {{ valueWithAdditionalText }}
    </p>
</template>

<script>
    import BaseFieldContentMixin from './BaseFieldContentMixin.js';
    import BaseFieldInnerComponentMixin from './BaseFieldInnerComponentMixin.js';
    import FieldLabelIdMixin from '../FieldLabelIdMixin.js';

    export default {
        name: 'BaseFieldContentReadonlyMixin',
        mixins: [BaseFieldContentMixin, BaseFieldInnerComponentMixin, FieldLabelIdMixin],
        props: {
            field: { type: Object, required: true },
            value: { type: [Number, String, Array, Boolean, Object], default: null },
            data: { type: Object, required: true },
        },
        computed: {
            valueWithAdditionalText() {
                return this.field.prependText + this.preparedValue + this.field.appendText;
            },
            preparedValue() {
                if (this.value === undefined || this.value === null) {
                    return '';
                }
                return this.value;
            },
        },
    };
</script>
