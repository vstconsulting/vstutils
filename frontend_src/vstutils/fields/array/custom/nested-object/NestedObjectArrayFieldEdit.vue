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

            <div class="d-flex">
                <button type="button" class="btn btn-success" @click="addItem">
                    <i class="fas fa-plus" />
                    {{ $t('Add') }}
                </button>
                <HideButton v-if="hideable" class="ml-1" @click.native="$emit('hide-field', field)" />
            </div>
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
    import Card from '@/vstutils/components/Card.vue';
    import ModelFields from '@/vstutils/components/page/ModelFields.vue';
    import { emptyRepresentData } from '@/vstutils/utils';
    import type { NestedObjectField } from '@/vstutils/fields/nested-object';
    import type ArrayField from '../../ArrayField';
    import type { ExtractRepresent } from '@/vstutils/fields/base';
    import { HideButton } from '@/vstutils/fields/buttons';

    type Value = ExtractRepresent<ArrayField<NestedObjectField>>;

    const props = defineProps<{
        field: ArrayField<NestedObjectField>;
        data: Record<string, unknown>;
        value?: Value;
        hideable?: boolean;
    }>();

    const emit = defineEmits<{
        (e: 'set-value', value?: Value): void;
    }>();

    const newItemData = ref(emptyRepresentData());
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

    function changeItem(idx: number, field: string, value: unknown) {
        const newData = { ...items.value[idx].data, [field]: value };
        const newValue = props.value!.slice();
        newValue[idx] = newData;
        emit('set-value', newValue);
    }
</script>
