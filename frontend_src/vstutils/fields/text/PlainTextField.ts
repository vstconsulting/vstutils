import { defineComponent } from 'vue';

import { TextAreaField, TextAreaFieldMixin } from './TextAreaField';
import PlainTextFieldContentReadonly from './PlainTextFieldContentReadonly.vue';

const PlainTextFieldMixin = defineComponent({
    components: {
        field_content_readonly: PlainTextFieldContentReadonly,
    },
    extends: TextAreaFieldMixin,
});

/**
 * This field represents text data, saving all invisible symbols (spaces, tabs, new line symbol).
 */
export class PlainTextField extends TextAreaField {
    static get mixins() {
        return [PlainTextFieldMixin];
    }
}

export default PlainTextField;
