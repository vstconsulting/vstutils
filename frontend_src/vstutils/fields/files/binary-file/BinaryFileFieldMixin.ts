import { defineComponent } from 'vue';
import { FileFieldMixin } from '../file';
import BinaryFileFieldContentEdit from './BinaryFileFieldContentEdit.vue';
import BinaryFileFieldReadonly from './BinaryFileFieldReadonly.vue';

const BinaryFileFieldMixin = defineComponent({
    components: {
        field_content_edit: BinaryFileFieldContentEdit,
        field_content_readonly: BinaryFileFieldReadonly,
    },
    extends: FileFieldMixin,
});

export default BinaryFileFieldMixin;
