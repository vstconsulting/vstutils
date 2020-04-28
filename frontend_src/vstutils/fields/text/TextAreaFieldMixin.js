import TextAreaFieldContentReadonly from './TextAreaFieldContentReadonly.vue';
import TextAreaFieldContentEdit from './TextAreaFieldContentEdit.vue';

const TextAreaFieldMixin = {
    components: {
        field_content_readonly: TextAreaFieldContentReadonly,
        field_content_edit: TextAreaFieldContentEdit,
    },
};

export default TextAreaFieldMixin;
