import Papa from 'papaparse';
import { FileField } from '../file';
import { i18n } from '../../../translation';
import CsvFileFieldEdit from './CSVFileFieldEdit.vue';
import CsvFileFieldReadonly from './CsvFileFieldReadonly';

export { CsvFileFieldEdit, CsvFileFieldReadonly };

/** @vue/component */
export const CsvFileFieldMixin = {
    components: {
        field_content_edit: CsvFileFieldEdit,
        field_content_readonly: CsvFileFieldReadonly,
    },
    data() {
        return {
            fileData: null,
        };
    },
    methods: {
        readFileOnLoadCallback(event) {
            this.fileData = event.target.result;
            this.$el.querySelector('input').value = '';
        },
    },
};

export class CsvFileField extends FileField {
    constructor(options) {
        super(options);
        this.delimiter = this.props.delimiter;
        this.minColumnWidth = this.props.minColumnWidth;
    }

    static get mixins() {
        return super.mixins.concat(CsvFileFieldMixin);
    }

    toInner(data) {
        const value = super.toInner(data);
        return Papa.unparse(value, { delimiter: this.delimiter, header: false, skipEmptyLines: true });
    }

    getTableConfig() {
        const obj = this.props.items;
        const tableConfig = [{ prop: '_index', name: i18n.t('Index') }];
        for (const [name, property] of Object.entries(obj.properties)) {
            const column = {
                prop: name,
                name: property.title || name,
            };
            if (!this.readOnly && obj.required.includes(name)) {
                // this statement is forced by the peculiarity of the library
                column.eClass = { missedValue: `"\${${name}}" === "0"` };
            }
            tableConfig.push(column);
        }
        return tableConfig;
    }

    parseFile(text) {
        return Papa.parse(text, {
            delimiter: this.delimiter,
            header: false,
            skipEmptyLines: true,
        });
    }
}
