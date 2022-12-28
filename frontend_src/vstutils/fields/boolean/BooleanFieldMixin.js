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
    },
    components: {
        field_content_readonly: BooleanFieldContentReadonly,
        field_content_edit: BooleanFieldContentEdit,
        field_list_view: BooleanFieldListView,
    },
};

export default BooleanFieldMixin;
