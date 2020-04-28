import TextAreaField from './TextAreaField.js';
import StringArrayFieldMixin from './StringArrayFieldMixin.js';

/**
 * String array guiField class.
 */
class StringArrayField extends TextAreaField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(StringArrayFieldMixin);
    }
}

export default StringArrayField;
