<template>
    <p :id="label_id" class="text-muted field-label">
        <span class="field-name">{{ label }}</span>
        <Popover v-if="field.description" :content="$t(field.description)" />
        <Popover v-if="error" link-text="!" :content="error" class="label-error-symbol" />
    </p>
</template>

<script>
    import Popover from '../../components/Popover.vue';
    import BaseFieldInnerComponentMixin from './BaseFieldInnerComponentMixin.js';
    import FieldLabelIdMixin from '../FieldLabelIdMixin.js';

    export default {
        name: 'BaseFieldLabel',
        components: { Popover },
        mixins: [BaseFieldInnerComponentMixin, FieldLabelIdMixin],
        props: {
            type: { type: String, required: true },
            error: { type: String, default: null },
        },
        computed: {
            label() {
                return this.$t(this.field.title);
            },
        },
    };
</script>

<style>
    .field-component .field-label {
        margin-bottom: 0.2rem;
    }

    .field-component .label-error-symbol {
        color: red;
        font-weight: bold;
    }
</style>
