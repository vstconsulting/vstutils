<template>
    <div :class="wrapperClasses">
        <component v-if="labelComponent" :is="labelComponent" v-bind="props" :for="inputId" />
        <slot :inputId="inputId" />
    </div>
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import { getUniqueId } from '../../utils';
    import { useFieldWrapperClasses } from './composables';
    import { FieldPropsDef } from './props';

    const props = defineProps(FieldPropsDef);

    const inputId = `field-input-${getUniqueId()}`;
    const wrapperClasses = useFieldWrapperClasses(props);
    const labelComponent = computed(() => {
        return props.type !== 'list' && !props.hideTitle && props.field.getLabelComponent();
    });
</script>
