import { defineComponent } from 'vue';
import { ArrayFieldMixin } from '../../mixins';
import NestedObjectArrayFieldEdit from './NestedObjectArrayFieldEdit.vue';

export const NestedObjectArrayFieldMixin = defineComponent({
    components: {
        field_content_edit: NestedObjectArrayFieldEdit,
    },
    mixins: [ArrayFieldMixin],
});
