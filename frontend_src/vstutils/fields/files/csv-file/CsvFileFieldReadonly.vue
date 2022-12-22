<template>
    <div v-if="rows.length > 0" style="margin: 0">
        <div class="table-header">
            <button id="download-button" class="btn btn-outline-secondary" @click="download">
                <i class="fa fa-download" aria-hidden="true" />
            </button>
            <div>
                <input id="checkbox" v-model="withHeader" type="checkbox" />
                <label for="checkbox">{{ $t('Download with headers') }}</label>
            </div>
        </div>
        <DataTable :config="tableConfig" :min-column-width="field.minColumnWidth" :rows="rows" readonly />
    </div>
</template>

<script setup lang="ts">
    import { computed, ref } from 'vue';
    import type { CsvFileField } from './index';
    import type { ExtractRepresent } from '../../base';
    import DataTable from './DataTable.vue';

    const props = defineProps<{
        field: CsvFileField;
        value: ExtractRepresent<CsvFileField> | null | undefined;
    }>();

    const withHeader = ref(false);
    const tableConfig = props.field.getTableConfig();

    const rows = computed(() => {
        if (!props.value) return [];
        const columnsNames = tableConfig.slice(1).map((column) => column.prop);
        const parsed = props.field.parseFile(props.value as string);
        const value = parsed.data.map((el) => {
            return el.reduce((acc: Record<string, unknown>, n, i) => {
                acc[columnsNames[i]] = n;
                return acc;
            }, {});
        });
        return value;
    });

    function download() {
        let data = props.value;

        if (withHeader.value) {
            const header = tableConfig
                .slice(1)
                .map((el) => el.name)
                .join(props.field.delimiter as string);
            data = `${header}\n${data}`;
        }

        const blob = new Blob([data as string], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        window.open(url);
        window.URL.revokeObjectURL(url);
    }
</script>

<style scoped>
    .csv-table::v-deep .item-cell.missedValue {
        border: 1px solid red;
    }

    .csv-table::v-deep span.missedValue::before {
        content: var(--required-error-text);
    }

    .csv-table::v-deep div.item-line.unselectable {
        background-color: transparent !important;
    }

    .csv-table::v-deep div.item-line.unselectable:hover {
        background-color: #dadee3 !important;
    }

    .table-header {
        color: #6c757d;
        position: relative;
        display: flex;
        flex-direction: column;
        min-width: 0;
        word-wrap: break-word;
        background-clip: border-box;
        border: 0 solid rgba(0, 0, 0, 0.125);
        border-radius: 0.25rem;
    }

    #download-button {
        width: fit-content;
    }
</style>

<style>
    .dark-mode .csv-table div.item-line.unselectable:hover {
        background-color: #3a4047 !important;
    }
</style>
