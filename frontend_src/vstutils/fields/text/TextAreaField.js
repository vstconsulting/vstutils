import { BaseField } from '../base';
import TextAreaFieldMixin from './TextAreaFieldMixin.js';

/**
 * Textarea guiField class.
 */
class TextAreaField extends BaseField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(TextAreaFieldMixin);
    }
}

export default TextAreaField;
