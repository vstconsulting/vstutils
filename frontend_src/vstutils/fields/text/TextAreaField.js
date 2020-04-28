import $ from 'jquery';
import { BaseField } from '../base';
import TextAreaFieldMixin from './TextAreaFieldMixin.js';

/**
 * Textarea guiField class.
 */
class TextAreaField extends BaseField {
    /**
     * Redefinition of base guiField method '_insertTestValue_getElement'.
     */
    _insertTestValue_getElement(format) {
        let selector = '.guifield-' + format + '-' + this.options.name + ' textarea';
        return $(selector)[0];
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(TextAreaFieldMixin);
    }
}

export default TextAreaField;
