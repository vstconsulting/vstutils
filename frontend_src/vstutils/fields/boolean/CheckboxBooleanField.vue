<template>
    <FieldWrapper v-bind="props" #default="{ inputId }">
        <input :id="inputId" type="checkbox" v-model="value" :disabled="props.type !== 'edit'" />
    </FieldWrapper>
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import { Field, FieldEmitsDef, FieldEmitsDefType, FieldPropsDef, FieldPropsDefType } from '../base';
    import FieldWrapper from '../base/FieldWrapper.vue';

    const props = defineProps(FieldPropsDef as FieldPropsDefType<Field<boolean, boolean>>);
    const emit = defineEmits(FieldEmitsDef as FieldEmitsDefType<Field<boolean, boolean>>);

    const value = computed({
        get() {
            return props.field.getValue(props.data);
        },
        set(value) {
            emit('set-value', {
                field: props.field.name,
                value,
                markChanged: true,
            });
        },
    });
</script>
