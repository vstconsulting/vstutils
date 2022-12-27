<template>
    <FieldTextarea :value="value || ''" :field="field" @input="$emit('set-value', $event)" />
</template>

<script lang="ts">
    import { defineComponent } from 'vue';
    import {
        FieldEditPropsDef,
        FieldEditEmitsDef,
        type FieldEditEmitsDefType,
        type FieldEditPropsDefType,
    } from '@/vstutils/fields/base';
    import FieldTextarea from './FieldTextarea.vue';
    import type { TextAreaField } from './TextAreaField';

    export default defineComponent({
        components: {
            FieldTextarea,
        },
        props: FieldEditPropsDef as FieldEditPropsDefType<TextAreaField>,
        emits: FieldEditEmitsDef as FieldEditEmitsDefType<TextAreaField>,
    });
</script>
