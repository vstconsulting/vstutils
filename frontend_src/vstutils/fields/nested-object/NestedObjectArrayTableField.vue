<template>
    <FieldWrapper v-bind="props">
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th v-for="{ field } in columns" :key="`column-${field.name}`">
                            {{ $t(field.title) }}
                        </th>
                    </tr>
                </thead>

                <tbody>
                    <tr v-for="(data, row) in items" :key="`row-${row}`">
                        <td v-for="{ field, component } in columns" :key="`column-${field.name}`">
                            <component
                                :is="component"
                                :field="field"
                                :data="data"
                                hideTitle
                                :type="type !== 'edit' ? 'list' : 'edit'"
                                @set-value="setValue({ row, field, params: $event })"
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </FieldWrapper>
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import {
        Field,
        FieldEmitsDef,
        FieldEmitsDefType,
        FieldPropsDef,
        SetFieldValueOptions,
        type FieldPropsDefType,
    } from '../base';
    import FieldWrapper from '../base/FieldWrapper.vue';
    import type { ArrayField } from '../array/ArrayField';
    import type { NestedObjectField } from './index';
    import { emitNestedObjectsTableRowBeforeChange } from './signals';

    const props = defineProps(FieldPropsDef as FieldPropsDefType<ArrayField<NestedObjectField>>);
    const emit = defineEmits(FieldEmitsDef as FieldEmitsDefType<ArrayField<NestedObjectField>>);

    const items = computed(() => {
        return props.field.getValue(props.data) ?? [];
    });
    const model = computed(() => {
        return props.field.itemField!.nestedModel!;
    });
    const columns = computed(() => {
        return [...model.value.fields.values()]
            .filter((field) => !field.hidden)
            .map((field) => {
                return {
                    field,
                    component: field.getComponent(),
                };
            });
    });

    function setValue({ row, field, params }: { row: number; field: Field; params: SetFieldValueOptions }) {
        const itemsCopy = [...items.value];
        const newRow = { ...itemsCopy[row], [field.name]: params.value };

        const ctx = {
            changedField: field.name,
            rowData: newRow,
            newValue: params.value,
            oldValue: itemsCopy[row][field.name],
        };
        emitNestedObjectsTableRowBeforeChange(props.field.model!.name, props.field.name, ctx);

        itemsCopy[row] = ctx.rowData;

        emit('set-value', {
            ...params,
            field: props.field.name,
            value: itemsCopy,
        });
    }
</script>

<style lang="css" scoped>
    .table {
        word-break: normal;
        table-layout: auto;

        th {
            text-align: center;
        }
    }
</style>
