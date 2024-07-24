import Papa from 'papaparse';
import { defineComponent } from 'vue';

import { BaseField, BaseFieldMixin } from '#vstutils/fields/base';
import { onAppBeforeInit } from '#vstutils/signals';
import { emptyInnerData } from '#vstutils/utils';

import { validateSimpleFileLength } from '../file';
import CsvFileFieldEdit from './CSVFileFieldEdit.vue';
import CsvFileFieldReadonly from './CsvFileFieldReadonly.vue';

import type { ParseConfig } from 'papaparse';
import type { FieldOptions, FieldXOptions } from '#vstutils/fields/base';
import type { InnerData, RepresentData } from '#vstutils/utils';
import type { ModelConstructor } from '#vstutils/models';
import type { ModelDefinition } from '#vstutils/schema';
import type { IFileField } from '../file';
import { guiPopUp } from '#vstutils/popUp';
import { i18n } from '#vstutils/translation';

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
    items: ModelDefinition;
}

interface ParserConfig extends ParseConfig<unknown[]> {
    delimiter?: string;
}

export class CsvFileField extends BaseField<string, InnerData[], CsvFileFieldXOptions> implements IFileField {
    parserConfig: ParserConfig;
    minColumnWidth?: number;
    rowModel?: ModelConstructor;

    allowedMediaTypes = ['text/csv'];

    constructor(options: FieldOptions<CsvFileFieldXOptions, string>) {
        super(options);
        this.parserConfig = { header: false, skipEmptyLines: true };
        if (this.props.parserConfig) {
            Object.assign(this.parserConfig, this.props.parserConfig);
        }
        this.minColumnWidth = this.props.minColumnWidth;

        onAppBeforeInit(() => {
            this.rowModel = this.app.modelsResolver.bySchemaObject(this.props.items);
        });
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
            return Papa.unparse(value, this.parserConfig as Papa.UnparseConfig);
        }
        return value;
    }

    toRepresent(data: InnerData) {
        const strValue = this.getValue(data);
        if (typeof strValue == 'string') {
            return this.parseFile(strValue);
        }
        return strValue;
    }

    getColumnsNames() {
        return Array.from(this.rowModel!.fields.keys());
    }

    get delimiter() {
        return this.parserConfig.delimiter || ',';
    }

    validateInner(data: InnerData) {
        const value = super.validateInner(data);

        if (value) {
            validateSimpleFileLength(this, value);
        }

        return value;
    }

    /**
     * Parses CSV file text. If error occurs, shows popup with error message.
     * @returns Array of inner data objects or undefined if text cannot be parsed
     */
    parseFile(text: string): InnerData[] | undefined {
        const columnsNames = this.getColumnsNames();
        const parsed = Papa.parse(text, this.parserConfig);
        if (parsed.errors.length > 0) {
            console.error(parsed);
            guiPopUp.error(
                i18n.ts('Cannot parse CSV file in field "{fieldName}"', { fieldName: i18n.t(this.title) }),
            );
            return;
        }
        return parsed.data.map((el) => {
            return el.reduce((acc: InnerData, n, i) => {
                acc[columnsNames[i]] = n;
                return acc;
            }, emptyInnerData());
        });
    }

    unparse(value: InnerData[], omitHeader = false) {
        return Papa.unparse(value, { delimiter: this.delimiter, header: !omitHeader });
    }
}
