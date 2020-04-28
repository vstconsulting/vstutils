import TextAreaField from './TextAreaField.js';
import PlainTextFieldMixin from './PlainTextFieldMixin.js';

/**
 * Plain text guiField class.
 * This field represents text data, saving all invisible symbols (spaces, tabs, new line symbol).
 */
class PlainTextField extends TextAreaField {
    /**
     * Redefinition of textarea guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(PlainTextFieldMixin);
    }
}

export default PlainTextField;
