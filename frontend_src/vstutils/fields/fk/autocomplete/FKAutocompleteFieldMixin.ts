import { defineComponent } from 'vue';
import { FKFieldMixin } from '../fk';
import FKAutocompleteFieldContentEdit from './FKAutocompleteFieldContentEdit.vue';

const FKAutocompleteFieldMixin = defineComponent({
    components: {
        field_content_edit: FKAutocompleteFieldContentEdit,
    },
    mixins: [FKFieldMixin],
});

export default FKAutocompleteFieldMixin;
