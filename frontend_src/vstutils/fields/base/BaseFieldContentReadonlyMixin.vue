<template>
    <p :aria-label="aria_label" :aria-labelledby="label_id">
        {{ preparedValue }}
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
            preparedValue() {
                return this.value;
            },
        },
    };
</script>
