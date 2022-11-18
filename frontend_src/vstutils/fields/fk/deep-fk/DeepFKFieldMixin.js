import DeepFKFieldContentEditable from './DeepFKFieldContentEditable.vue';
import FKFieldContentReadonly from '../fk/FKFieldContentReadonly.vue';
import { BaseFieldMixin } from '../../base';

const DeepFKFieldMixin = {
    mixins: [BaseFieldMixin],
    components: {
        field_content_edit: DeepFKFieldContentEditable,
        field_content_readonly: FKFieldContentReadonly,
        field_list_view: FKFieldContentReadonly,
    },
};

export default DeepFKFieldMixin;
