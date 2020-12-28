import $ from 'jquery';
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
        /**
         * Method, returns false, if file's size is invalid (too large).
         * Otherwise, it returns true.
         * @param file_size {number} File's size.
         * @return {boolean}
         */
        isFileSizeValid(file_size) {
            if (this.field.options.max_size !== undefined) {
                return this.field.options.max_size <= file_size;
            }
            return true;
        },
        /**
         * Method, that reads content of selected file
         * and sets field value equal to this content.
         */
        readFile(event) {
            let file = event.target.files[0];

            if (!file) {
                return;
            }

            if (!this.isFileSizeValid(file.size)) {
                guiPopUp.error('File is too large');
                console.log('File is too large ' + file.size);
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

            let el = $(this.$el).find('#file_reader_input');
            $(el).val('');
        },
    },
    components: {
        field_content_edit: FileFieldContentEdit,
    },
};

export default FileFieldMixin;
