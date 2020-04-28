import NamedBinaryImageFieldContentReadonly from './NamedBinaryImageFieldContentReadonly.vue';
import NamedBinaryImageFieldContentEdit from './NamedBinaryImageFieldContentEdit.vue';

const NamedBinaryImageFieldMixin = {
    components: {
        field_content_readonly: NamedBinaryImageFieldContentReadonly,
        field_content_edit: NamedBinaryImageFieldContentEdit,
    },
};

export default NamedBinaryImageFieldMixin;
