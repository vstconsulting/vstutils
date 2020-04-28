import PlainTextField from './PlainTextField.js';
import HTMLFieldMixin from './HTMLFieldMixin.js';

/**
 * Html guiField class.
 */
class HTMLField extends PlainTextField {
    /**
     * Redefinition of plain_text guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(HTMLFieldMixin);
    }
}

export default HTMLField;
