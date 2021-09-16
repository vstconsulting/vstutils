<template>
    <p :aria-label="aria_label" :aria-labelledby="label_id">
        <span v-if="prependText" v-text="$t(prependText) + ' '" />
        {{ preparedValue }}
        <span v-if="appendText" v-text="' ' + $t(appendText)" />
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
            preparedValue() {
                if (this.value === undefined || this.value === null) {
                    return '';
                }
                return this.value;
            },
        },
    };
</script>

<style scoped>
    p {
        margin: 0;
    }
</style>
