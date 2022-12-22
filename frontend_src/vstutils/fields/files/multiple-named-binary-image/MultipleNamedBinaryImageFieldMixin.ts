import { defineComponent } from 'vue';
import { BaseFieldMixin } from '@/vstutils/fields/base';
import MultipleNamedBinaryImageFieldContentReadonly from './MultipleNamedBinaryImageFieldContentReadonly.vue';
import MultipleNamedBinaryImageFieldContentEdit from './MultipleNamedBinaryImageFieldContentEdit.vue';
import MultipleNamedBinaryImageFieldListView from './MultipleNamedBinaryImageFieldListView.vue';

const MultipleNamedBinaryImageFieldMixin = defineComponent({
    components: {
        field_content_readonly: MultipleNamedBinaryImageFieldContentReadonly,
        field_content_edit: MultipleNamedBinaryImageFieldContentEdit,
        field_list_view: MultipleNamedBinaryImageFieldListView,
    },
    extends: BaseFieldMixin,
});

export default MultipleNamedBinaryImageFieldMixin;
