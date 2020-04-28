import { guiPopUp } from '../../popUp';
import { BaseFieldContentReadonlyMixin } from '../base';
import PasswordFieldContent from './PasswordFieldContent.js';
import PasswordFieldContentEdit from './PasswordFieldContentEdit.vue';

const PasswordFieldMixin = {
    methods: {
        copyValueToClipBoard() {
            let value = this.value;
            let field_name = this.field.options.title || this.field.options.name;

            if (!value) {
                value = '';
            }

            try {
                navigator.clipboard
                    .writeText(value)
                    .then(() => {
                        guiPopUp.success(
                            'Value of <b>' + field_name + '</b> field was successfully copied to clipboard.',
                        );
                    })
                    .catch((error) => {
                        throw error;
                    });
            } catch (e) {
                console.error(e);
                guiPopUp.error('Value of <b>' + field_name + '</b> field was not copied to clipboard.');
            }
        },
    },
    components: {
        field_content_readonly: {
            mixins: [BaseFieldContentReadonlyMixin, PasswordFieldContent],
        },
        field_content_edit: PasswordFieldContentEdit,
    },
};

export default PasswordFieldMixin;
