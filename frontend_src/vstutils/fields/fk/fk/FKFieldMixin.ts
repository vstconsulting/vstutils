import { defineComponent } from 'vue';
import { BaseFieldMixin } from '@/vstutils/fields/base';
import FKFieldContentEditable from './FKFieldContentEditable.vue';
import FKFieldContentReadonly from './FKFieldContentReadonly.vue';

const FKFieldMixin = defineComponent({
    components: {
        field_content_edit: FKFieldContentEditable,
        field_content_readonly: FKFieldContentReadonly,
        field_list_view: FKFieldContentReadonly,
    },
    mixins: [BaseFieldMixin],
});

export default FKFieldMixin;
