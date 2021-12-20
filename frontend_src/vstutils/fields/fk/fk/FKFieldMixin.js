import FKFieldContentEditable from './FKFieldContentEditable.vue';
import FKFieldContentReadonlyComponent from './FKFieldContentReadonlyComponent.vue';
import { BaseFieldMixin } from '../../base';

const FKFieldMixin = {
    mixins: [BaseFieldMixin],
    components: {
        field_content_edit: FKFieldContentEditable,
        field_content_readonly: FKFieldContentReadonlyComponent,
        field_list_view: FKFieldContentReadonlyComponent,
    },
};

export default FKFieldMixin;
