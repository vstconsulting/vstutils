<template>
    <select ref="selectEl" class="form-control select2 select2-field-select" :value="value" />
</template>

<script lang="ts">
    import { computed, defineComponent, onMounted, ref, toRef, watch } from 'vue';
    import { useSelect2 } from '@/vstutils/select2';
    import { FieldEditPropsDef } from '@/vstutils/fields/base';
    import type { FieldEditPropsDefType } from '@/vstutils/fields/base';
    import type { SelectedData } from '@/vstutils/select2';
    import type { ChoicesField } from './ChoicesField';

    export default defineComponent({
        props: FieldEditPropsDef as FieldEditPropsDefType<ChoicesField>,
        emits: ['set-value'],
        setup(props, { emit }) {
            const selectEl = ref<HTMLSelectElement | null>(null);

            const disableIfEmpty = computed(() => {
                if (props.field.fieldForEnum !== undefined) {
                    return props.field.fieldForEnum;
                }
                return false;
            });

            const enumItems = computed(() => {
                const enumItems =
                    props.field.fieldForEnum !== undefined
                        ? (props.data[props.field.fieldForEnum] as string[])
                        : props.field.enum;

                const enumData = props.field.prepareEnumData(enumItems);
                for (const item of enumData) {
                    item.text = props.field.translateValue(item.text);
                }
                return enumData;
            });

            const validIds = computed(() => enumItems.value.map((value) => value.id));

            // eslint-disable-next-line no-undef
            function handleChange(data: SelectedData[], event: JQuery.ChangeEvent) {
                let value;
                const selected = data[0];

                if (selected && selected.id) {
                    value = selected.id;
                } else {
                    value = event.target.value || null;
                }

                if (!validIds.value.includes(value) && value) {
                    setValue(validIds.value[0] || null);
                    return;
                }
                if (props.value !== value) {
                    if (value === undefined || value === null) {
                        value = props.field.getInitialValue();
                    }
                    emit('set-value', value);
                }
            }

            const { init: initSelect2, setValue } = useSelect2(selectEl, handleChange);

            watch(toRef(props, 'value'), (value) => {
                setValue(value);
            });

            onMounted(() => {
                watch(
                    enumItems,
                    (newVal) => {
                        if (!newVal) {
                            return;
                        }
                        const clearable = props.field.nullable || !props.field.required;

                        if (clearable) {
                            enumItems.value.unshift({ id: '', text: ' ' });
                        }

                        initSelect2({
                            width: '100%',
                            data: newVal,
                            disabled: disableIfEmpty.value && newVal.length === 0,
                            allowClear: clearable,
                            placeholder: { id: undefined, text: '' },
                            templateResult: props.field.templateResult,
                            templateSelection: props.field.templateSelection,
                            matcher: props.field.customMatcher,
                        });

                        if (props.value !== undefined) {
                            setValue(props.value);
                        } else {
                            if (props.field.hasDefault) {
                                setValue(props.field.default);
                            } else if (props.field.required) {
                                setValue(enumItems.value[0] ?? null);
                            }
                        }
                    },
                    { immediate: true },
                );
            });

            return { selectEl };
        },
    });
</script>
