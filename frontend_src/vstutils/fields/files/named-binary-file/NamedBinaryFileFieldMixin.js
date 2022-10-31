import NamedBinaryFileFieldContentReadonly from './NamedBinaryFileFieldContentReadonly.vue';
import NamedBinaryFileFieldContentEdit from './NamedBinaryFileFieldContentEdit.vue';
import NamedBinaryFileFieldContentList from './NamedBinaryFileFieldContentList.vue';

const NamedBinaryFileFieldMixin = {
    components: {
        field_content_readonly: NamedBinaryFileFieldContentReadonly,
        field_content_edit: NamedBinaryFileFieldContentEdit,
        field_list_view: NamedBinaryFileFieldContentList,
    },
};

export default NamedBinaryFileFieldMixin;
