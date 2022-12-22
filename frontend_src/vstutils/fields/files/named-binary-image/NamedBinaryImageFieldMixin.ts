import { defineComponent } from 'vue';
import { BaseFieldMixin } from '@/vstutils/fields/base';
import NamedBinaryImageFieldContentReadonly from './NamedBinaryImageFieldContentReadonly.vue';
import NamedBinaryImageFieldContentEdit from './NamedBinaryImageFieldContentEdit.vue';

const NamedBinaryImageFieldMixin = defineComponent({
    components: {
        field_content_readonly: NamedBinaryImageFieldContentReadonly,
        field_content_edit: NamedBinaryImageFieldContentEdit,
        field_list_view: NamedBinaryImageFieldContentReadonly,
    },
    extends: BaseFieldMixin,
});

export default NamedBinaryImageFieldMixin;
