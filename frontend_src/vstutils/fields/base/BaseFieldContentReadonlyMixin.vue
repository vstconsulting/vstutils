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
        props: ['field', 'value', 'data'],
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
