import { defineComponent } from 'vue';
import { ArrayFieldMixin } from '@/vstutils/fields/array/mixins';
import DeepFkArrayFieldEdit from './DeepFkArrayFieldEdit.vue';

export const DeepFkArrayFieldMixin = defineComponent({
    components: {
        field_content_edit: DeepFkArrayFieldEdit,
    },
    mixins: [ArrayFieldMixin],
});
