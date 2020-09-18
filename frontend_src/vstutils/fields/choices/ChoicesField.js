import $ from 'jquery';
import { StringField } from '../text';
import ChoicesFieldMixin from './ChoicesFieldMixin.js';

/**
 * Choices guiField class.
 */
class ChoicesField extends StringField {
    /**
     * Redefinition of string guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        return data[this.options.name];
    }
    /**
     * Redefinition of string guiField method toRepresent.
     * @param {object} data
     */
    toRepresent(data = {}) {
        return data[this.options.name];
    }
    /**
     * Redefinition of base guiField method '_insertTestValue_getElement'.
     */
    _insertTestValue_getElement(format) {
        let selector = '.guifield-' + format + '-' + this.options.name + ' select';
        return $(selector)[0];
    }
    /**
     * Redefinition _insertTestValue_imitateEvent
     */
    _insertTestValue_imitateEvent(el) {
        el.dispatchEvent(new Event('change'));
    }
    /**
     * Redefinition of string guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(ChoicesFieldMixin);
    }
}

export default ChoicesField;
