import DeepFKFieldContentEditable from './DeepFKFieldContentEditable.vue';
import FKFieldContentReadonlyComponent from '../fk/FKFieldContentReadonlyComponent.vue';
import FKFieldListView from '../fk/FKFieldListView.vue';
import { BaseFieldMixin } from '../../base';

const DeepFKFieldMixin = {
    mixins: [BaseFieldMixin],
    components: {
        field_content_edit: DeepFKFieldContentEditable,
        field_content_readonly: FKFieldContentReadonlyComponent,
        field_list_view: FKFieldListView,
    },
};

export default DeepFKFieldMixin;
