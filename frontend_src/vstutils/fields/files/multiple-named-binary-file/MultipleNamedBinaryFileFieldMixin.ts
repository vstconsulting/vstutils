import { defineComponent } from 'vue';

import { BaseFieldMixin } from '#vstutils/fields/base';

import MultipleNamedBinaryFileFieldContentEdit from './MultipleNamedBinaryFileFieldContentEdit.vue';
import MultipleNamedBinaryFileFieldContentList from './MultipleNamedBinaryFileFieldContentList.vue';
import MultipleNamedBinaryFileFieldContentReadonly from './MultipleNamedBinaryFileFieldContentReadonly.vue';

const MultipleNamedBinaryFileFieldMixin = defineComponent({
    components: {
        field_content_readonly: MultipleNamedBinaryFileFieldContentReadonly,
        field_content_edit: MultipleNamedBinaryFileFieldContentEdit,
        field_list_view: MultipleNamedBinaryFileFieldContentList,
    },
    extends: BaseFieldMixin,
});

export default MultipleNamedBinaryFileFieldMixin;
