import MultipleNamedBinaryImageFieldContentReadonly from './MultipleNamedBinaryImageFieldContentReadonly.vue';
import MultipleNamedBinaryImageFieldContentEdit from './MultipleNamedBinaryImageFieldContentEdit.vue';
import MultipleNamedBinaryImageFieldListView from './MultipleNamedBinaryImageFieldListView.vue';

const MultipleNamedBinaryImageFieldMixin = {
    components: {
        field_content_readonly: MultipleNamedBinaryImageFieldContentReadonly,
        field_content_edit: MultipleNamedBinaryImageFieldContentEdit,
        field_list_view: MultipleNamedBinaryImageFieldListView,
    },
};

export default MultipleNamedBinaryImageFieldMixin;
