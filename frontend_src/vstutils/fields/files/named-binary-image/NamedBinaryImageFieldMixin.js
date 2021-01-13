import NamedBinaryImageFieldContentReadonly from './NamedBinaryImageFieldContentReadonly.vue';
import NamedBinaryImageFieldContentEdit from './NamedBinaryImageFieldContentEdit.vue';
import NamedBinaryImageFieldListView from './NamedBinaryImageFieldListView.vue';

const NamedBinaryImageFieldMixin = {
    components: {
        field_content_readonly: NamedBinaryImageFieldContentReadonly,
        field_content_edit: NamedBinaryImageFieldContentEdit,
        field_list_view: NamedBinaryImageFieldListView,
    },
};

export default NamedBinaryImageFieldMixin;
