import ChoicesFieldContentReadonly from './ChoicesFieldContentReadonly.vue';
import ChoicesFieldContentEdit from './ChoicesFieldContentEdit.vue';
import ChoicesFieldListView from './ChoicesFieldListView.vue';
import { BaseFieldMixin } from '../base';

const ChoicesFieldMixin = {
    mixins: [BaseFieldMixin],
    components: {
        field_list_view: {
            mixins: [ChoicesFieldListView],

            computed: {
                classes() {
                    return [...this.class_list, 'text-data', this.choices_classes];
                },
            },
        },
        field_content_readonly: ChoicesFieldContentReadonly,
        field_content_edit: ChoicesFieldContentEdit,
    },
};

export default ChoicesFieldMixin;
