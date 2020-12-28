import NamedBinaryFileFieldContentReadonly from './NamedBinaryFileFieldContentReadonly.vue';
import NamedBinaryFileFieldContentEdit from './NamedBinaryFileFieldContentEdit.vue';

const NamedBinaryFileFieldMixin = {
    components: {
        field_content_readonly: NamedBinaryFileFieldContentReadonly,
        field_content_edit: NamedBinaryFileFieldContentEdit,
    },
};

export default NamedBinaryFileFieldMixin;
