<template>
    <div>
        <Card>
            <ModelFields
                :model="modelClass"
                :data="newItemData"
                editable
                flat-if-possible
                flat-fields-classes="col-12"
                @set-value="(options) => setValue(options)"
            />

            <div class="d-flex">
                <button type="button" class="btn btn-success" @click="addItem">
                    <i class="fas fa-plus" />
                    {{ $t('Add') }}
                </button>
                <HideButton v-if="hideable" class="ml-1" @click.native="$emit('hide-field')" />
            </div>
        </Card>

        <Card v-for="(item, idx) in items" :key="idx">
            <ModelFields
                :model="modelClass"
                :data="item.data"
                :fieldsErrors="errorArray[idx]"
                editable
                flat-if-possible
                flat-fields-classes="col-12"
                @set-value="(options) => changeItem(idx, options)"
            />

            <button type="button" class="btn btn-danger" @click="removeItem(idx)">
                <i class="fas fa-minus" />
                {{ $t('Remove') }}
            </button>
        </Card>
    </div>
</template>

<script setup lang="ts">
    import { computed, ref, set } from 'vue';
    import Card from '#vstutils/components/Card.vue';
    import ModelFields from '#vstutils/components/page/ModelFields.vue';
    import { emptyRepresentData } from '#vstutils/utils';
    import type { NestedObjectField } from '#vstutils/fields/nested-object/index';
    import type ArrayField from '#vstutils/fields/array/ArrayField';
    import type { FieldEditPropsDefType } from '#vstutils/fields/base';
    import {
        FieldEditPropsDef,
        type ExtractRepresent,
        type SetFieldValueOptions,
    } from '#vstutils/fields/base';
    import { HideButton } from '#vstutils/fields/buttons';

    type Value = ExtractRepresent<ArrayField<NestedObjectField>>;

    const props = defineProps(FieldEditPropsDef as FieldEditPropsDefType<ArrayField<NestedObjectField>>);
    const emit = defineEmits<{
        (e: 'set-value', value?: Value): void;
        (e: 'hide-field'): void;
    }>();

    const newItemData = ref(emptyRepresentData());
    const items = computed(() => {
        return (props.value ?? []).map((data) => {
            return {
                data,
            };
        });
    });
    const errorArray = computed(() => {
        return Array.isArray(props.error) ? props.error : [];
    });

    const modelClass = props.field.itemField!.nestedModel!;

    function addItem() {
        try {
            emit('set-value', [newItemData.value, ...(props.value ?? [])]);
            newItemData.value = emptyRepresentData();
        } catch (e) {
            console.error(e);
        }
    }

    function removeItem(idx: number) {
        if (props.value) {
            const value = props.value.slice();
            value.splice(idx, 1);
            emit('set-value', value);
        }
    }

    function changeItem(idx: number, options: SetFieldValueOptions) {
        if (!options.field) {
            return;
        }
        const newData = { ...items.value[idx].data, [options.field]: options.value };
        const newValue = props.value!.slice();
        newValue[idx] = newData;
        emit('set-value', newValue);
    }

    function setValue(options: SetFieldValueOptions) {
        if (options.field) {
            set(newItemData.value, options.field, options.value);
        }
    }
</script>
