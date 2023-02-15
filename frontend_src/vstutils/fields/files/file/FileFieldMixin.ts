import { defineComponent } from 'vue';
import type { FieldPropsDefType } from '@/vstutils/fields/base';
import { BaseFieldMixin, FieldPropsDef } from '@/vstutils/fields/base';
import FileFieldContentEdit from './FileFieldContentEdit.vue';
import type FileField from './FileField';

const FileFieldMixin = defineComponent({
    components: {
        field_content_edit: FileFieldContentEdit,
    },
    extends: BaseFieldMixin,
    props: FieldPropsDef as FieldPropsDefType<FileField>,
    data() {
        return {
            file_reader_method: 'readAsText' as
                | 'readAsArrayBuffer'
                | 'readAsBinaryString'
                | 'readAsDataURL'
                | 'readAsText',
            file_obj: undefined as File | undefined,
        };
    },
    methods: {
        /**
         * Method, that reads content of selected file
         * and sets field value equal to this content.
         */
        readFile(event: FileList | Event) {
            const file = event instanceof FileList ? event[0] : (event.target as HTMLInputElement).files?.[0];

            if (!file) {
                return;
            }

            this.file_obj = file;

            const reader = new FileReader();

            reader.onload = this.readFileOnLoadCallback.bind(this);

            reader[this.file_reader_method](file);
        },
        /**
         * Method - callback for onLoad event of FileReader.
         * @param {object} event Event object.
         */
        readFileOnLoadCallback(event: ProgressEvent<FileReader>) {
            this.$emit('set-value', { field: this.field.name, value: event.target!.result });
            this.$el.querySelector('input')!.value = '';
        },
    },
});

export default FileFieldMixin;
