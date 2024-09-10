<template>
    <FieldWrapper v-bind="props">
        <div v-if="type === 'edit' && !field.readOnly" class="input-group">
            <div class="input-group-prepend">
                <button
                    class="btn btn-outline-secondary"
                    type="button"
                    :disabled="!minusAllowed"
                    @click="minus"
                >
                    -
                </button>
            </div>
            <input
                class="form-control value"
                type="number"
                :min="minimum ?? undefined"
                :max="maximum ?? undefined"
                :value="value"
                @blur="handleBlur"
            />
            <div class="input-group-append">
                <button
                    class="btn btn-outline-secondary"
                    type="button"
                    :disabled="!plusAllowed"
                    @click="plus"
                >
                    +
                </button>
            </div>
        </div>
        <div v-else>
            {{ value }}
        </div>
    </FieldWrapper>
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import { FieldEmitsDef, FieldEmitsDefType, FieldPropsDef, FieldPropsDefType } from '../base';
    import FieldWrapper from '../base/FieldWrapper.vue';
    import type { PlusMinusIntegerField } from './integer';

    const props = defineProps(FieldPropsDef as FieldPropsDefType<PlusMinusIntegerField>);
    const emit = defineEmits(FieldEmitsDef as FieldEmitsDefType<PlusMinusIntegerField>);

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

    const minimum = computed(() => {
        return props.field.getNumberMinimum(props.data);
    });

    const maximum = computed(() => {
        return props.field.getNumberMaximum(props.data);
    });

    const minusAllowed = computed(() => {
        const min = minimum.value;
        return min === undefined || min === null || (value.value ?? 0) > min;
    });
    const plusAllowed = computed(() => {
        const max = maximum.value;
        return max === undefined || max === null || (value.value ?? 0) < max || value.value === undefined;
    });

    function minus() {
        value.value = (value.value ?? 0) - 1;
    }

    function plus() {
        value.value = (value.value ?? 0) + 1;
    }

    function handleBlur(e: FocusEvent) {
        const target = e.target as HTMLInputElement;
        const newValue = target.valueAsNumber;

        if (Number.isNaN(newValue)) {
            value.value = undefined;
            return;
        }

        const max = maximum.value;
        if (max !== undefined && max !== null && newValue > max) {
            value.value = maximum.value;
            return;
        }

        const min = minimum.value;
        if (min !== undefined && min !== null && newValue < min) {
            value.value = minimum.value;
            return;
        }

        value.value = newValue;
    }
</script>

<style lang="css" scoped>
    .input-group {
        flex-wrap: nowrap;
    }

    .value {
        width: 10ch;
    }

    /* Chrome, Safari, Edge, Opera */
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    /* Firefox */
    input[type='number'] {
        -moz-appearance: textfield;
    }
</style>
