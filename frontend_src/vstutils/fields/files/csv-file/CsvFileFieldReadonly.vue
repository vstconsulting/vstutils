<template>
    <div v-if="rows.length > 0" style="margin: 0">
        <DataTable :config="tableConfig" :min-column-width="field.minColumnWidth" :rows="rows" readonly />
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../../base';
    import DataTable from './DataTable';

    export default {
        components: { DataTable },
        mixins: [BaseFieldContentReadonlyMixin],
        data() {
            return {
                tableConfig: this.field.getTableConfig(),
                parsed: {
                    data: [],
                    errors: [],
                    meta: null,
                },
            };
        },
        computed: {
            rows() {
                const columnsNames = this.tableConfig.slice(1).map((column) => column.prop);
                const parsed = this.field.parseFile(this.value);
                const value = parsed.data.map((el) => {
                    return el.reduce((acc, n, i) => ((acc[columnsNames[i]] = n), acc), {});
                });
                return value;
            },
        },
    };
</script>

<style scoped>
    .csv-table::v-deep .item-cell.missedValue {
        border: 1px solid red;
    }

    .csv-table::v-deep span.missedValue::before {
        content: var(--required-error-text);
    }
</style>
