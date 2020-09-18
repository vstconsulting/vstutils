import MultiselectFieldListView from './MultiselectFieldListView.vue';
import MultiselectFieldContentReadonly from './MultiselectFieldContentReadonly.vue';
import MultiselectFieldContentEdit from './MultiselectFieldContentEdit.vue';

const MultiselectFieldMixin = {
    components: {
        field_list_view: MultiselectFieldListView,
        field_content_readonly: MultiselectFieldContentReadonly,
        field_content_edit: MultiselectFieldContentEdit,
    },
    methods: {
        /**
         * Redefinition of 'handleValue' method of base guiField.
         * @param {object} data Object with values of current field
         * and fields from the same fields_wrapper.
         */
        handleValue(data) {
            return this.field.toInner(data);
        },
    },
};

export default MultiselectFieldMixin;
