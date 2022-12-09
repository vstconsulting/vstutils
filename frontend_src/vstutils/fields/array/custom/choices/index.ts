import { defineComponent } from 'vue';
import { StringArrayFieldMixin } from '../string';
import ChoicesArrayFieldEdit from './ChoicesArrayFieldEdit.vue';

export const ChoicesArrayFieldMixin = defineComponent({
    components: {
        field_content_edit: ChoicesArrayFieldEdit,
    },
    mixins: [StringArrayFieldMixin],
});
