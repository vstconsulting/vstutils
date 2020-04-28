import { BaseField } from '../base';
import TextParagraphFieldMixin from './TextParagraphFieldMixin.js';

/**
 * Text paragraph guiField class.
 */
class TextParagraphField extends BaseField {
    /**
     * Redefinition of 'toRepresent' method of base guiField.
     */
    toRepresent(data = {}) {
        let value = data[this.options.name];

        if (value === undefined) {
            return this.options.default;
        }

        if (typeof value == 'object') {
            if (Array.isArray(value)) {
                return value.join(' ');
            }

            return JSON.stringify(value);
        }

        return value;
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(TextParagraphFieldMixin);
    }
}

export default TextParagraphField;
