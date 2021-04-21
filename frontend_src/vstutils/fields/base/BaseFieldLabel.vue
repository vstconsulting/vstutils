<template>
    <p :id="label_id" class="text-muted field-label">
        {{ label }}
        <Popover v-if="field.description" :content="$t(field.description)" />
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
</style>
