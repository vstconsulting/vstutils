<template>
    <div>
        <Card>
            <ModelFields
                :model="modelClass"
                :data="newItemData"
                editable
                flat-if-possible
                flat-fields-classes="col-12"
                @set-value="({ field, value }) => $set(newItemData, field, value)"
            />

            <button type="button" class="btn btn-success" @click="addItem">
                <i class="fas fa-plus" />
                {{ $t('Add') }}
            </button>
        </Card>

        <Card v-for="(item, idx) in items" :key="idx">
            <ModelFields
                :model="modelClass"
                :data="item.data"
                editable
                flat-if-possible
                flat-fields-classes="col-12"
                @set-value="({ field, value }) => changeItem(idx, field, value)"
            />

            <button type="button" class="btn btn-danger" @click="removeItem(idx)">
                <i class="fas fa-minus" />
                {{ $t('Remove') }}
            </button>
        </Card>
    </div>
</template>

<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { Card } from '@/vstutils/components';
    import { ModelFields } from '@/vstutils/components/page';
    import type { NestedObjectField } from '@/vstutils/fields/nested-object';
    import type ArrayField from '../../ArrayField';
    import type { ExtractRepresent } from '@/vstutils/fields/base';

    type Value = ExtractRepresent<ArrayField<NestedObjectField>>;

    const props = defineProps<{
        field: ArrayField<NestedObjectField>;
        data: Record<string, unknown>;
        value?: Value;
    }>();

    const emit = defineEmits<{
        (e: 'set-value', value?: Value): void;
    }>();

    const newItemData = ref<Record<string, unknown>>({});
    const items = computed(() => {
        return (props.value ?? []).map((data) => {
            return {
                data,
            };
        });
    });

    const modelClass = props.field.itemField!.nestedModel!;

    function addItem() {
        try {
            emit('set-value', [newItemData.value, ...(props.value ?? [])]);
            newItemData.value = {};
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

    function changeItem(idx: number, field: string, value: unknown) {
        const newData = { ...items.value[idx].data, [field]: value };
        const newValue = props.value!.slice();
        newValue[idx] = newData;
        emit('set-value', newValue);
    }
</script>
