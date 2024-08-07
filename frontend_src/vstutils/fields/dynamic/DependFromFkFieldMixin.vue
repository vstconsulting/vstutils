<template>
    <component
        :is="realField.getComponent()"
        :field="realField"
        :data="data"
        :type="type"
        @set-value="$emit('set-value', $event)"
    />
</template>

<script setup lang="ts">
    import { watch, ref } from 'vue';
    import { type FieldPropsDefType, type SetFieldValueOptions, FieldPropsDef } from '#vstutils/fields/base';
    import type { DependFromFkField } from './DependFromFkField';

    const props = defineProps(FieldPropsDef as FieldPropsDefType<DependFromFkField>);
    const emit = defineEmits<{
        (e: 'set-value', payload: SetFieldValueOptions<DependFromFkField>): void;
    }>();

    const realField = ref(props.field.getRealField(props.data));

    watch(
        () => props.data[props.field.dependField],
        () => {
            realField.value = props.field.getRealField(props.data);
            if (props.type === 'edit') {
                emit('set-value', {
                    field: props.field.name,
                    value: realField.value.getInitialValue(),
                    markChanged: false,
                });
            }
        },
    );
</script>
