<template>
    <div class="csv-table" :style="requiredErrorTextVar">
        <div class="file-buttons">
            <ClearButton @click.native="clear" />
            <ReadFileButton @read-file="$parent.readFile($event)" />
            <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
        </div>

        <div v-if="rows.length > 0" style="margin: 0">
            <button class="btn btn-outline-primary" @click="add"><i class="fa fa-plus" /></button>
            <vue-virtual-table
                :config="tableConfig"
                :data="rows"
                :height="600"
                :item-height="55"
                :selectable="false"
                :min-width="tableConfig.length * minColumnWidth"
                language="en"
            >
                <template #actionCommon="{ index, row }">
                    <button class="btn btn-outline-secondary" @click="edit(index, row)">
                        <i class="fa fa-edit" />
                    </button>
                    <button class="btn btn-outline-warning" @click="del(index, row)">
                        <i class="fa fa-times" />
                    </button>
                </template>
            </vue-virtual-table>
            <BootstrapModal ref="editModal" :title="$t('Receive order')" body-classes="p-0">
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
    </div>
</template>
<script>
    import Papa from 'papaparse';
    import VueVirtualTable from 'vue-virtual-table';
    import BootstrapModal from '../../../components/BootstrapModal';
    import { FileFieldContentEdit } from '../file';
    import { guiPopUp } from '../../../popUp';

    export default {
        components: {
            BootstrapModal: BootstrapModal,
            VueVirtualTable: VueVirtualTable,
        },
        mixins: [FileFieldContentEdit],
        data() {
            return {
                parsed: {
                    data: [],
                    errors: [],
                    meta: null,
                },
                editingRow: {},
                editingRowIdx: null,

                requiredErrorTextVar: `--required-error-text: "${this.$t('Column is required!')}"`,
            };
        },
        computed: {
            tableConfig() {
                return this.field.tableConfig;
            },
            minColumnWidth() {
                return this.field.minColumnWidth;
            },
            editableColumns() {
                return this.tableConfig.slice(2);
            },
            columnsNames() {
                return this.editableColumns.map((column) => column.prop);
            },
            requiredColumnsNames() {
                return this.tableConfig.filter((el) => el.eClass?.missedValue).map((el) => el.prop);
            },
            rows() {
                return this.value || [];
            },
        },
        watch: {
            '$parent.fileData': 'updateFile',
        },
        methods: {
            clear() {
                this.$parent.fileData = null;
                this.$emit('set-value', this.field.getInitialValue());
            },
            updateFile(file) {
                if (!file) {
                    this.setValue([]);
                    return;
                }
                const parsed = Papa.parse(file, {
                    delimiter: this.delimiter,
                    header: false,
                    skipEmptyLines: true,
                });
                const value = parsed.data.map((el) => {
                    return el.reduce((acc, n, i) => ((acc[this.columnsNames[i]] = n), acc), {});
                });
                this.setValue(value);
                this.editing = {};
            },
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
                this.setValue(newRows);
                guiPopUp.success(this.$t('Object removed from the list'));
            },
            saveRow(e) {
                e.preventDefault();
                const newRow = Object.fromEntries(
                    this.columnsNames.map((name) => [name, e.target.elements[name].value]),
                );
                const newRows = this.rows.slice();
                newRows[this.editingRowIdx] = newRow;
                this.setValue(newRows);
                this.editingRow = {};
                this.editingRowIdx = null;
                this.$refs.editModal.close();
                guiPopUp.success(this.$t('Action completed successfully'));
            },
        },
    };
</script>

<style scoped>
    .btn {
        margin: 5px;
    }
    /*To keep file buttons the same size*/
    .field-button {
        height: 36px;
    }

    .csv-table::v-deep .item-cell.missedValue {
        border: 1px solid red;
    }

    .csv-table::v-deep span.missedValue::before {
        content: var(--required-error-text);
    }
    .file-buttons {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        flex-grow: 1;
        margin-bottom: 0;
        padding-bottom: 0;
    }
</style>
