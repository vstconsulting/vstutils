import BooleanFieldContentEdit from './BooleanFieldContentEdit.vue';
import BooleanFieldContentReadonly from './BooleanFieldContentReadonly.vue';
import BooleanFieldListView from './BooleanFieldListView.vue';
import BaseFieldMixin from '../base/BaseFieldMixin.vue';

const BooleanFieldMixin = {
    mixins: [BaseFieldMixin],
    methods: {
        toggleValue() {
            this.setValue(!this.value);
        },
        /**
         * Method, that sets some value (default or false) to current boolean field,
         * if it is not hidden and it's value === undefined.
         * This is needed, because without this operation,
         * user will see that value of field is 'false', but in store value will be equal to undefined.
         */
        initBooleanValue() {
            if (!this.is_hidden && this.value === undefined) {
                let value = false;

                if (this.field.options.default !== undefined) {
                    value = this.field.options.default;
                }

                this.setValue(value);
            }
        },
    },
    mounted() {
        this.initBooleanValue();
    },
    watch: {
        is_hidden: function (is_hidden) {
            this.initBooleanValue();
        },
    },
    components: {
        field_content_readonly: BooleanFieldContentReadonly,
        field_content_edit: BooleanFieldContentEdit,
        field_list_view: BooleanFieldListView,
    },
};

export default BooleanFieldMixin;
