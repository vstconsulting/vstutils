import $ from 'jquery';
import { stringToBoolean } from '../../utils';
import { BaseField } from '../base';
import BooleanFieldMixin from './BooleanFieldMixin.js';

class BooleanField extends BaseField {
    /**
     * Custom method for toInner and toRepresent methods.
     * @param {object} data
     */
    _getValue(data = {}) {
        let value = data[this.options.name];

        if (typeof value == 'boolean') {
            return value;
        }

        if (typeof value == 'string') {
            return stringToBoolean(value);
        }

        if (typeof value == 'number') {
            return Boolean(value);
        }
    }

    /**
     * Redefinition of base guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        return this._getValue(data);
    }
    /**
     * Redefinition of base guiField method toRepresent.
     * @param {object} data
     */
    toRepresent(data = {}) {
        return this._getValue(data);
    }
    /**
     * Redefinition of base guiField method _insertTestValue.
     */
    _insertTestValue(data) {
        let value = data[this.options.name];
        let format = this.options.format || this.options.type;
        let el = this._insertTestValue_getElement(format);

        this._insertTestValue_imitateEvent(el);

        if ($(el).hasClass('selected') == value) {
            this._insertTestValue_imitateEvent(el);
        }
    }
    /**
     * Redefinition of base guiField method '_insertTestValue_getElement'.
     */
    _insertTestValue_getElement(format) {
        let selector = '.guifield-' + format + '-' + this.options.name + ' .boolean-select';
        return $(selector)[0];
    }
    /**
     * Redefinition of base guiField method _insertTestValue_imitateEvent.
     */
    _insertTestValue_imitateEvent(el) {
        $(el).trigger('click');
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(BooleanFieldMixin);
    }
}

export default BooleanField;
