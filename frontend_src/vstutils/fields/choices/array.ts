import { type Component, defineComponent } from 'vue';
import ChoicesArrayFieldEdit from './ChoicesArrayFieldEdit.vue';
import { StringArrayFieldMixin } from '#vstutils/fields/text/string-array';

export const ChoicesArrayFieldMixin: Component = defineComponent({
    components: {
        field_content_edit: ChoicesArrayFieldEdit,
    },
    mixins: [StringArrayFieldMixin],
});
