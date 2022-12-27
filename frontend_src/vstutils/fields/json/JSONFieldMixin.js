import JsonFieldContentReadonly from './JsonFieldContentReadonly.vue';
import { TextAreaFieldContentEdit } from '../text';

const JSONFieldMixin = {
    provide() {
        return {
            jsonMapper: this.field.jsonMapper,
        };
    },
    components: {
        field_content_readonly: JsonFieldContentReadonly,
        field_content_edit: TextAreaFieldContentEdit,
    },
};

export default JSONFieldMixin;
