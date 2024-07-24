import { BaseFieldMixin } from '#vstutils/fields/base';
import { defineComponent } from 'vue';

import NamedBinaryFileFieldContentEdit from './NamedBinaryFileFieldContentEdit.vue';
import NamedBinaryFileFieldReadonly from './NamedBinaryFileFieldReadonly.vue';

const NamedBinaryFileFieldMixin = defineComponent({
    components: {
        field_content_readonly: NamedBinaryFileFieldReadonly,
        field_content_edit: NamedBinaryFileFieldContentEdit,
        field_list_view: NamedBinaryFileFieldReadonly,
    },
    extends: BaseFieldMixin,
});

export default NamedBinaryFileFieldMixin;
