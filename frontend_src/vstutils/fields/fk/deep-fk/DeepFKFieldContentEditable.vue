<template>
    <FkTree :field="field" :value="value ? [value] : []" @update:value="setValue" />
</template>

<script setup lang="ts">
    import { defineAsyncComponent } from 'vue';
    import {
        FieldEditPropsDef,
        FieldEditEmitsDef,
        type FieldEditPropsDefType,
        type FieldEditEmitsDefType,
        type SetFieldValueParams,
    } from '#vstutils/fields/base';
    import type DeepFKField from './DeepFKField';

    const FkTree = defineAsyncComponent(() => import('./FkTree.vue'));

    const props = defineProps(FieldEditPropsDef as FieldEditPropsDefType<DeepFKField>);
    const emit = defineEmits(FieldEditEmitsDef as FieldEditEmitsDefType<DeepFKField>);

    function setValue(value: (typeof props)['value'][], options?: SetFieldValueParams) {
        if (value && value.length === 0 && !props.value) {
            return;
        }
        emit('set-value', value[0] ? value[0] : null, options);
    }
</script>
