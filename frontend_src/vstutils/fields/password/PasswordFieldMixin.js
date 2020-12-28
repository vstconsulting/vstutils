import { BaseFieldContentReadonlyMixin } from '../base';
import PasswordFieldContent from './PasswordFieldContent.js';
import PasswordFieldContentEdit from './PasswordFieldContentEdit.vue';

const PasswordFieldMixin = {
    components: {
        field_content_readonly: {
            mixins: [BaseFieldContentReadonlyMixin, PasswordFieldContent],
        },
        field_content_edit: PasswordFieldContentEdit,
    },
};

export default PasswordFieldMixin;
