<template>
    <div class="csv-table">
        <button v-if="!readonly" class="btn btn-outline-primary my-2" type="button" @click="add">
            <i class="fa fa-plus" />
        </button>
        <CustomVirtualTable
            :config="tableConfig"
            :data="rows"
            :height="600"
            :item-height="55"
            :selectable="false"
            :min-width="tableConfig.length * minColumnWidth"
            language="en"
        >
            <template v-if="!readonly" #actionCommon="{ index, row }">
                <button class="btn btn-outline-secondary" type="button" @click="edit(index, row)">
                    <i class="fa fa-edit" />
                </button>
                <button
                    class="btn btn-outline-warning"
                    type="button"
                    style="margin-left: 5px"
                    @click="del(index)"
                >
                    <i class="fa fa-times" />
                </button>
            </template>
        </CustomVirtualTable>
        <BootstrapModal ref="editModal" body-classes="p-0">
            <form v-if="editingRow" id="row-edit-form" @submit.prevent="saveRow">
                <ModelFields
                    :model="model"
                    :data="editingRow.sandbox.value"
                    flat-if-possible
                    flat-fields-classes="col-12"
                    editable
                    @set-value="editingRow?.sandbox.set($event)"
                />
            </form>
            <template #footer>
                <button class="btn btn-primary" type="submit" form="row-edit-form">
                    {{ $t('Save') }}
                </button>
            </template>
        </BootstrapModal>
    </div>
</template>

<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { i18n } from '#vstutils/translation';
    import { guiPopUp } from '#vstutils/popUp';
    import BootstrapModal from '#vstutils/components/BootstrapModal.vue';
    import type { Model, ModelConstructor } from '#vstutils/models';

    const props = withDefaults(
        defineProps<{
            model: ModelConstructor;
            rows: InnerData[];
            readonly?: boolean;
            minColumnWidth?: number;
        }>(),
        { minColumnWidth: 200 },
    );

    const emit = defineEmits<{
        (e: 'change', value: InnerData[]): void;
    }>();

    const app = getApp();

    const editingRow = ref<Model>();
    const editingRowIdx = ref<number | null>(null);
    const editModal = ref<InstanceType<typeof BootstrapModal>>();

    const config = computed(() => getTableConfig(props.model, props.readonly));
    const tableConfig = computed(() => {
        const conf = config.value.slice();
        if (!props.readonly) {
            conf.splice(1, 0, {
                prop: '_action',
                name: i18n.ts('Actions'),
                actionName: 'actionCommon',
                width: 200,
            });
        }
        return conf;
    });

    function edit(index: number, row: InnerData) {
        editingRow.value = new props.model(row);
        editingRowIdx.value = index;
        editModal.value!.open();
    }
    function add() {
        editingRow.value = new props.model();
        editingRowIdx.value = props.rows.length;
        editModal.value!.open();
    }
    function del(index: number) {
        const newRows = props.rows.slice();
        newRows.splice(index, 1);
        emit('change', newRows);
        guiPopUp.success(i18n.ts('Object removed from the list'));
    }
    function saveRow() {
        let data: InnerData;
        try {
            data = editingRow.value!.sandbox.validate();
        } catch (e) {
            app.error_handler.defineErrorAndShow(e);
            return;
        }
        const newRows = props.rows.slice();
        newRows[editingRowIdx.value!] = data;
        emit('change', newRows);
        editingRow.value = undefined;
        editingRowIdx.value = null;
        editModal.value!.close();
        guiPopUp.success(i18n.ts('Action completed successfully'));
    }
</script>

<script lang="ts">
    import { defineComponent } from 'vue';
    // @ts-expect-error - no types
    import VueVirtualTable from 'vue-virtual-table';
    import ModelFields from '#vstutils/components/page/ModelFields.vue';
    import type { InnerData } from '#vstutils/utils';
    import { getApp } from '#vstutils/utils';

    const CustomVirtualTable = defineComponent({
        mixins: [VueVirtualTable],
        methods: {
            parseClass(eClass: any, row: any) {
                const result: Record<string, unknown> = {};
                for (const cl in eClass) {
                    result[cl] = new Function('row', eClass[cl])(row);
                }
                return result;
            },
        },
    });

    interface ColumnConfig {
        prop: string;
        name: string;
        actionName?: string;
        width?: number;
        eClass?: {
            missedValue?: string;
        };
    }

    export function getTableConfig(model: ModelConstructor, readonly?: boolean) {
        const tableConfig: ColumnConfig[] = [{ prop: '_index', name: i18n.ts('Index') }];
        const fields = Array.from(model.fields.values());
        for (const field of fields) {
            const column: ColumnConfig = {
                prop: field.name,
                name: field.title,
            };
            if (!readonly && field.required) {
                column.eClass = {
                    missedValue: `
                        const value = row["${field.name}"];
                        return !value || value === '0';
                    `,
                };
            }
            tableConfig.push(column);
        }
        return tableConfig;
    }
</script>

<style scoped>
    .csv-table::v-deep .item-cell {
        margin: -1px -1px 0 0;
        border: 1px solid transparent;
        border-bottom: 1px solid #ebeef5;
    }
    .csv-table::v-deep .item-line:first-child {
        padding: 1px 0 0 0;
    }
    .csv-table::v-deep .item-cell.missedValue {
        border-color: red;
    }
    .csv-table::v-deep span.missedValue::before {
        content: var(--required-error-text);
    }
    .csv-table::v-deep .header-cell-inner {
        text-align: center !important;
        word-break: break-word !important;
    }
</style>
