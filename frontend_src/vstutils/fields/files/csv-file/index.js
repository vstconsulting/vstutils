import Papa from 'papaparse';
import { FileField } from '../file';
import { i18n } from '../../../translation';
import CsvFileFieldEdit from './CSVFileFieldEdit.vue';

export { CsvFileFieldEdit };

/** @vue/component */
export const CsvFileFieldMixin = {
    components: {
        field_content_edit: CsvFileFieldEdit,
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
        this.tableConfig = this.schemaObjectToTableConfig(this.getItems());
        this.minColumnWidth = this.props.minColumnWidth;
        this.innerAsArray = this.props.innerAsArray;
    }

    getItems() {
        if (this.type === 'string') {
            return this.props.items;
        }
        if (this.type === 'array') {
            return this.options.items;
        }
        throw new Error('Unknown field type');
    }

    static get mixins() {
        return super.mixins.concat(CsvFileFieldMixin);
    }

    toInner(data) {
        const value = super.toInner(data);
        if (this.type === 'string') {
            return Papa.unparse(value, { delimiter: this.delimiter, header: false, skipEmptyLines: true });
        }
        return value;
    }

    schemaObjectToTableConfig(obj) {
        const tableConfig = [
            { prop: '_index', name: i18n.t('Index') },
            { prop: '_action', name: i18n.t('Actions'), actionName: 'actionCommon', width: 200 },
        ];
        for (const [name, property] of Object.entries(obj.properties)) {
            const column = {
                prop: name,
                name: property.title || name,
            };
            if (obj.required.includes(name)) {
                // this statement is forced by the peculiarity of the library
                column.eClass = { missedValue: `"\${${name}}" === "0"` };
            }
            tableConfig.push(column);
        }

        return tableConfig;
    }
}
