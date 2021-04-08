import ChoicesFieldContentEdit from './ChoicesFieldContentEdit.vue';
import { BaseFieldMixin } from '../base';

const ChoicesFieldMixin = {
    mixins: [BaseFieldMixin],
    components: {
        field_content_edit: ChoicesFieldContentEdit,
    },
};

export default ChoicesFieldMixin;
