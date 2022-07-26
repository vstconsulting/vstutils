<template>
    <div class="csv-table" :style="requiredErrorTextVar">
        <FileSelector
            :show-hide-button="hasHideButton"
            :has-value="value && value.length"
            :media-types="field.allowedMediaTypes"
            :text="selectorText"
            @read-file="$parent.readFile($event)"
            @clear="clear"
            @hide="$emit('hide-field', field)"
        />

        <div v-if="rows.length > 0" style="margin: 0">
            <DataTable
                :config="tableConfig"
                :min-column-width="field.minColumnWidth"
                :rows="rows"
                @change="setValue"
            />
        </div>
    </div>
</template>
<script>
    import { guiPopUp } from '../../../popUp';
    import { FileFieldContentEdit } from '../file';
    import DataTable from './DataTable';
    import FileSelector from '../FileSelector.vue';

    export default {
        components: {
            DataTable,
            FileSelector,
        },
        mixins: [FileFieldContentEdit],
        data() {
            return {
                parsed: {
                    data: [],
                    errors: [],
                    meta: null,
                },
                tableConfig: this.field.getTableConfig(),
                requiredErrorTextVar: `--required-error-text: "${this.$t('Column is required!')}"`,
            };
        },
        computed: {
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
                    this.setValue(null);
                    return;
                }
                const columnsNames = this.tableConfig.slice(1).map((column) => column.prop);
                const parsed = this.field.parseFile(file);
                if (parsed.errors.length > 0) {
                    guiPopUp.error();
                    console.error(parsed);
                    return;
                }
                const value = parsed.data.map((el) => {
                    return el.reduce((acc, n, i) => ((acc[columnsNames[i]] = n), acc), {});
                });
                this.setValue(value);
                this.editing = {};
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
    .file-buttons {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        flex-grow: 1;
        margin-bottom: 0;
        padding-bottom: 0;
    }
</style>
