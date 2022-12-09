<template>
    <FieldReadonlyValue :field="field" :value="preparedValue" />
</template>

<script lang="ts">
    import type { PropType } from 'vue';
    import { defineComponent } from 'vue';
    import type { Field } from './BaseField';
    import FieldLabelIdMixin from '../FieldLabelIdMixin';
    import BaseFieldContentMixin from './BaseFieldContentMixin';
    import BaseFieldInnerComponentMixin from './BaseFieldInnerComponentMixin';
    import FieldReadonlyValue from './FieldReadonlyValue.vue';

    export default defineComponent({
        name: 'BaseFieldContentReadonlyMixin',
        components: { FieldReadonlyValue },
        mixins: [BaseFieldContentMixin, BaseFieldInnerComponentMixin, FieldLabelIdMixin],
        props: {
            field: { type: Object as PropType<Field>, required: true },
            // eslint-disable-next-line vue/require-prop-types
            value: { default: undefined },
            data: { type: Object, required: true },
        },
        computed: {
            preparedValue(): string | number {
                return this.value as unknown as string | number;
            },
        },
    });
</script>
