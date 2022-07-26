import { guiPopUp } from '../../../popUp';
import FileFieldContentEdit from './FileFieldContentEdit.vue';

const FileFieldMixin = {
    data() {
        return {
            file_reader_method: 'readAsText',
            file_obj: undefined,
        };
    },
    created() {
        this.file_obj = {};
    },
    methods: {
        cleanValue() {
            this.file_obj = {};
            this.setValueInStore();
        },
        validateFileSize(fileSize) {
            if (this.field.maxSize !== undefined && this.field.maxSize <= fileSize) {
                guiPopUp.error('File is too large');
                console.log('File is too large ' + fileSize);
                return false;
            }
            return true;
        },
        /**
         * Method, that reads content of selected file
         * and sets field value equal to this content.
         */
        readFile(event) {
            const file = event instanceof FileList ? event[0] : event.target.files[0];

            if (!file || !this.validateFileSize(file.size)) {
                return;
            }

            this.file_obj = file;

            let reader = new FileReader();

            reader.onload = this.readFileOnLoadCallback;

            reader[this.file_reader_method](file);
        },
        /**
         * Method - callback for onLoad event of FileReader.
         * @param {object} event Event object.
         */
        readFileOnLoadCallback(event) {
            this.$emit('set-value', { field: this.field.name, value: event.target.result });
            this.$el.querySelector('input').value = '';
        },
    },
    components: {
        field_content_edit: FileFieldContentEdit,
    },
};

export default FileFieldMixin;
