import MultipleNamedBinaryImageFieldContentReadonly from './MultipleNamedBinaryImageFieldContentReadonly.vue';
import MultipleNamedBinaryImageFieldContentEdit from './MultipleNamedBinaryImageFieldContentEdit.vue';

const MultipleNamedBinaryImageFieldMixin = {
    components: {
        field_content_readonly: MultipleNamedBinaryImageFieldContentReadonly,
        field_content_edit: MultipleNamedBinaryImageFieldContentEdit,
    },
};

export default MultipleNamedBinaryImageFieldMixin;
