import type { ParseConfig } from 'papaparse';
import Papa from 'papaparse';
import { defineComponent } from 'vue';

import { BaseField, BaseFieldMixin } from '@/vstutils/fields/base';
import { i18n } from '@/vstutils/translation';

import CsvFileFieldEdit from './CSVFileFieldEdit.vue';
import CsvFileFieldReadonly from './CsvFileFieldReadonly.vue';

import type { Schema } from 'swagger-schema-official';
import type { FieldOptions, FieldXOptions } from '@/vstutils/fields/base';
import type { RepresentData } from '@/vstutils/utils';

export { CsvFileFieldEdit, CsvFileFieldReadonly };

export const CsvFileFieldMixin = defineComponent({
    components: {
        field_content_edit: CsvFileFieldEdit,
        field_content_readonly: CsvFileFieldReadonly,
    },
    extends: BaseFieldMixin,
});

interface CsvFileFieldXOptions extends FieldXOptions {
    minColumnWidth?: number;
    items: Schema;
}

interface ColumnConfig {
    prop: string;
    name: string;
    eClass?: {
        missedValue?: string;
    };
}

export class CsvFileField extends BaseField<
    string,
    string | unknown[][] | Record<string, unknown>[],
    CsvFileFieldXOptions
> {
    parserConfig: ParseConfig<unknown[]>;
    minColumnWidth?: number;

    constructor(options: FieldOptions<CsvFileFieldXOptions, string>) {
        super(options);
        this.parserConfig = { header: false, skipEmptyLines: true };
        if (this.props.parserConfig) {
            Object.assign(this.parserConfig, this.props.parserConfig);
        }
        this.minColumnWidth = this.props.minColumnWidth;
    }

    static get mixins() {
        return [CsvFileFieldMixin];
    }

    toInner(data: RepresentData) {
        const value = this.getValue(data);
        if (typeof value == 'string') {
            return value;
        }
        if (value) {
            return Papa.unparse(value as string[][], this.parserConfig as Papa.UnparseConfig);
        }
        return value;
    }

    get delimiter() {
        return this.parserConfig.delimiter || ',';
    }

    getTableConfig() {
        const obj = this.props.items;
        const tableConfig: ColumnConfig[] = [{ prop: '_index', name: i18n.ts('Index') }];
        for (const [name, property] of Object.entries(obj.properties ?? {})) {
            const column: ColumnConfig = {
                prop: name,
                name: property.title || name,
            };
            if (!this.readOnly && obj.required?.includes(name)) {
                column.eClass = {
                    missedValue: `
                        const value = row["${name}"];
                        return !value || value === '0';
                    `,
                };
            }
            tableConfig.push(column);
        }
        return tableConfig;
    }

    parseFile(text: string) {
        return Papa.parse(text, this.parserConfig);
    }
}
