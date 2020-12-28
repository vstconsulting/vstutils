import { guiPopUp } from '../../../popUp';
import MultipleNamedBinaryFileFieldContentReadonly from './MultipleNamedBinaryFileFieldContentReadonly.vue';
import MultipleNamedBinaryFileFieldContentEdit from './MultipleNamedBinaryFileFieldContentEdit.vue';

const MultipleNamedBinaryFileFieldMixin = {
    computed: {
        val() {
            return this.value === undefined ? [] : this.value;
        },
    },
    methods: {
        handleValue(data = {}) {
            return data[this.field.options.name];
        },

        readOneFile(file) {
            if (!file) {
                return;
            }

            if (!this.isFileSizeValid(file.size)) {
                guiPopUp.error('File "' + file.name + '" is too large.');
                console.log('File "' + file.name + '" is too large.');
                return;
            }

            let reader = new FileReader();

            reader.onload = (event) => {
                return this.readFileOnLoadCallback(event, file);
            };

            reader[this.file_reader_method](file);
        },

        readFileOnLoadCallback(event, file) {
            let files = [...this.val];
            let obj = {};
            obj[this.field.name] = event.target.result;
            files.push({
                name: file.name,
                content: this.field.toBase64(obj),
            });
            this.$emit('set-value', { field: this.field.name, value: files });
        },

        readFile(event) {
            let files = event.target.files;

            for (let index = 0; index < files.length; index++) {
                this.readOneFile(files[index]);
            }
        },
    },
    components: {
        field_content_readonly: MultipleNamedBinaryFileFieldContentReadonly,
        field_content_edit: MultipleNamedBinaryFileFieldContentEdit,
    },
};

export default MultipleNamedBinaryFileFieldMixin;
