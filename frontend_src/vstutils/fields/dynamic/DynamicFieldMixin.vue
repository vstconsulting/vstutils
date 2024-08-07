<template>
    <component
        :is="realField.getComponent()"
        :field="realField"
        :data="data"
        :type="type"
        :hideable="hideable"
        :error="error"
        @hide-field="$emit('hide-field')"
        @set-value="setValue"
    />
</template>

<script lang="ts">
    import { computed, defineComponent, ref, watch } from 'vue';
    import { deepEqual } from '#vstutils/utils';
    import type {
        FieldPropsDefType,
        SetFieldValueOptions,
        Field,
        FieldEmitsDefType,
    } from '#vstutils/fields/base';
    import { FieldEmitsDef } from '#vstutils/fields/base';
    import { FieldPropsDef } from '#vstutils/fields/base';
    import type { DynamicField } from './DynamicField';

    export default defineComponent({
        props: FieldPropsDef as FieldPropsDefType<DynamicField>,
        emits: FieldEmitsDef as FieldEmitsDefType<DynamicField>,
        setup(props, { emit }) {
            const savedValues = new WeakMap<Field, unknown>();
            const parentValues = computed(() => props.field._getParentValues(props.data));
            const realField = ref(props.field.getRealField(parentValues.value));

            function setValue(obj: SetFieldValueOptions) {
                savedValues.set(realField.value, obj.value);
                emit('set-value', obj);
            }

            watch(parentValues, (newValues, oldValues) => {
                if (deepEqual(newValues, oldValues)) {
                    return;
                }
                const newField = props.field.getRealField(newValues);
                if (newField.isEqual(realField.value)) {
                    return;
                }
                realField.value = newField;
                setValue({
                    field: props.field.name,
                    value: savedValues.has(realField.value)
                        ? savedValues.get(realField.value)
                        : realField.value.getInitialValue(),
                });
            });

            return { realField, setValue };
        },
    });
</script>
