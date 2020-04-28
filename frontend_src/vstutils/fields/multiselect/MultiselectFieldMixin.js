import MultiselectFieldListView from './MultiselectFieldListView.vue';
import MultiselectFieldContentReadonly from './MultiselectFieldContentReadonly.vue';
import MultiselectFieldContentEdit from './MultiselectFieldContentEdit.vue';

const MultiselectFieldMixin = {
    components: {
        field_list_view: MultiselectFieldListView,
        field_content_readonly: MultiselectFieldContentReadonly,
        field_content_edit: MultiselectFieldContentEdit,
    },
};

export default MultiselectFieldMixin;
