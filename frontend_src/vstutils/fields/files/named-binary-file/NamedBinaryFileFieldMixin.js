import NamedBinaryFileFieldContentReadonly from './NamedBinaryFileFieldContentReadonly.vue';
import NamedBinaryFileFieldContentEdit from './NamedBinaryFileFieldContentEdit.vue';

const NamedBinaryFileFieldMixin = {
    methods: {
        handleValue(data = {}) {
            return {
                name: this.file_obj.name || null,
                content: this.field.toBase64(data) || null,
            };
        },
    },
    components: {
        field_content_readonly: NamedBinaryFileFieldContentReadonly,
        field_content_edit: NamedBinaryFileFieldContentEdit,
    },
};

export default NamedBinaryFileFieldMixin;
