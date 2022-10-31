<template>
    <div class="csv-table">
        <button v-if="!readonly" class="btn btn-outline-primary my-2" @click="add">
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
                <button class="btn btn-outline-secondary" @click="edit(index, row)">
                    <i class="fa fa-edit" />
                </button>
                <button class="btn btn-outline-warning" style="margin-left: 5px" @click="del(index, row)">
                    <i class="fa fa-times" />
                </button>
            </template>
        </CustomVirtualTable>
        <BootstrapModal ref="editModal" body-classes="p-0">
            <form id="row-edit-form" @submit="saveRow">
                <div v-for="column in editableColumns" :key="column.prop" class="form-group">
                    <label :for="`edit-${column.prop}`">{{ column.name }}</label>
                    <input
                        :id="`edit-${column.prop}`"
                        type="text"
                        autocomplete="off"
                        class="form-control"
                        :required="requiredColumnsNames.includes(column.prop)"
                        :value="editingRow[column.prop]"
                        :name="column.prop"
                    />
                </div>
            </form>
            <template #footer>
                <button class="btn btn-primary" type="submit" form="row-edit-form">
                    {{ $t('Save') }}
                </button>
            </template>
        </BootstrapModal>
    </div>
</template>

<script>
    import { i18n } from '../../../translation';
    import { guiPopUp } from '../../../popUp';
    import BootstrapModal from '../../../components/BootstrapModal';
    import VueVirtualTable from 'vue-virtual-table';

    const CustomVirtualTable = {
        mixins: [VueVirtualTable],
        methods: {
            parseClass(eClass, row) {
                const result = {};
                for (const cl in eClass) {
                    result[cl] = new Function('row', eClass[cl])(row);
                }
                return result;
            },
        },
    };

    export default {
        name: 'DataTable',
        components: { BootstrapModal, CustomVirtualTable },
        props: {
            config: { type: Array, required: true },
            rows: { type: Array, required: true },
            readonly: { type: Boolean, default: false },
            minColumnWidth: { type: Number, default: 200 },
        },
        data() {
            return {
                editingRow: {},
                editingRowIdx: null,
            };
        },
        computed: {
            editableColumns() {
                return this.config.slice(1);
            },
            columnsNames() {
                return this.editableColumns.map((column) => column.prop);
            },
            tableConfig() {
                const config = this.config.slice();
                if (!this.readonly) {
                    config.splice(1, 0, {
                        prop: '_action',
                        name: i18n.t('Actions'),
                        actionName: 'actionCommon',
                        width: 200,
                    });
                }
                return config;
            },
            requiredColumnsNames() {
                if (this.readonly) {
                    return [];
                }
                return this.tableConfig.filter((el) => el.eClass?.missedValue).map((el) => el.prop);
            },
        },
        methods: {
            edit(index, row) {
                this.editingRow = row;
                this.editingRowIdx = index;
                this.$refs.editModal.open();
            },
            add() {
                this.editingRowIdx = this.rows.length;
                this.$refs.editModal.open();
            },
            del(index) {
                const newRows = this.rows.slice();
                newRows.splice(index, 1);
                this.$emit('change', newRows);
                guiPopUp.success(this.$t('Object removed from the list'));
            },
            saveRow(e) {
                e.preventDefault();
                const newRow = Object.fromEntries(
                    this.columnsNames.map((name) => [name, e.target.elements[name].value]),
                );
                const newRows = this.rows.slice();
                newRows[this.editingRowIdx] = newRow;
                this.$emit('change', newRows);
                this.editingRow = {};
                this.editingRowIdx = null;
                this.$refs.editModal.close();
                guiPopUp.success(this.$t('Action completed successfully'));
            },
        },
    };
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
