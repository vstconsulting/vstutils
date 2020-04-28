import $ from 'jquery';
import { StringField } from '../text';
import ChoicesFieldMixin from './ChoicesFieldMixin.js';

/**
 * Choices guiField class.
 */
class ChoicesField extends StringField {
    /**
     * Custom method for toInner and toRepresent methods.
     * @param {object} data
     */
    _getValue(data = {}) {
        let value = data[this.options.name];

        if (value && this.options.enum && this.options.enum.includes(value)) {
            return value;
        }
    }
    /**
     * Redefinition of string guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        return this._getValue(data);
    }
    /**
     * Redefinition of string guiField method toRepresent.
     * @param {object} data
     */
    toRepresent(data = {}) {
        return this._getValue(data);
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
