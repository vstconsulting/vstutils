import FKFieldContentEditable from './FKFieldContentEditable.vue';
import FKFieldContentReadonlyComponent from './FKFieldContentReadonlyComponent.vue';
import FKFieldListView from './FKFieldListView.vue';

const FKFieldMixin = {
    methods: {
        /**
         * Redefinition of 'handleValue' method of base guiField.
         * @param {object} data Object with values of current field
         * and fields from the same fields_wrapper.
         */
        handleValue: function (data) {
            return data[this.field.options.name];
        },
        /**
         * Redefinition of 'getRepresentValue' method of base guiField.
         * @param {object} data Object with values of current field
         * and fields from the same fields_wrapper.
         */
        getRepresentValue: function (data) {
            return data[this.field.options.name];
        },
    },
    components: {
        field_content_edit: FKFieldContentEditable,
        field_content_readonly: FKFieldContentReadonlyComponent,
        field_list_view: FKFieldListView,
    },
};

export default FKFieldMixin;
