<template>
    <select ref="selectEl" class="form-control select2 select2-field-select" :value="value" />
</template>

<script lang="ts">
    import { computed, defineComponent, onMounted, ref, toRef, watch } from 'vue';
    import { useSelect2 } from '@/vstutils/select2';
    import { FieldEditPropsDef } from '@/vstutils/fields/base';
    import type { FieldEditPropsDefType } from '@/vstutils/fields/base';
    import type { SelectedData } from '@/vstutils/select2';
    import type { ChoicesField, EnumItem, RawEnumItem } from './ChoicesField';

    export default defineComponent({
        props: FieldEditPropsDef as FieldEditPropsDefType<ChoicesField>,
        emits: ['set-value'],
        setup(props, { emit }) {
            const selectEl = ref<HTMLSelectElement | null>(null);

            let enumItems: EnumItem[] = [];
            let validIds: string[] = [];

            const disableIfEmpty = computed(() => {
                if (props.field.fieldForEnum !== undefined) {
                    return props.field.fieldForEnum;
                }
                return false;
            });

            function setEnum(newEnum: RawEnumItem[]) {
                enumItems = props.field.prepareEnumData(newEnum);
                for (const item of enumItems) {
                    item.text = props.field.translateValue(item.text);
                }
                validIds = enumItems.map((value) => value.id);
            }

            // eslint-disable-next-line no-undef
            function handleChange(data: SelectedData[], event: JQuery.ChangeEvent) {
                let value;
                const selected = data[0];

                if (selected && selected.id) {
                    value = selected.id;
                } else {
                    value = event.target.value || null;
                }

                if (!validIds.includes(value) && value) {
                    setValue(validIds[0] || null);
                    return;
                }
                if (props.value !== value) {
                    emit('set-value', value);
                }
            }

            const { init: initSelect2, setValue } = useSelect2(selectEl, handleChange);

            watch(toRef(props, 'value'), (value) => {
                setValue(value);
            });

            onMounted(() => {
                const fieldForEnum = props.field.fieldForEnum;
                const enumGetter =
                    fieldForEnum !== undefined
                        ? () => props.data[fieldForEnum] as string[]
                        : () => props.field.enum;

                watch(
                    enumGetter,
                    (newVal) => {
                        if (!newVal) {
                            return;
                        }
                        setEnum(newVal);
                        initSelect2({
                            width: '100%',
                            data: enumItems,
                            disabled: disableIfEmpty.value && enumItems.length === 0,
                            allowClear: props.field.nullable,
                            placeholder: { id: undefined, text: '' },
                            templateResult: props.field.templateResult,
                            templateSelection: props.field.templateSelection,
                            matcher: props.field.customMatcher,
                        });

                        if (props.value) {
                            setValue(props.value);
                        } else if (props.field.hasDefault) {
                            setValue(props.field.default);
                        } else {
                            setValue(enumItems[0] || null);
                        }
                    },
                    { immediate: true },
                );
            });

            return { selectEl };
        },
    });
</script>
