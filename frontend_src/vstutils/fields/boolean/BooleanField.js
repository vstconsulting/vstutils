import { stringToBoolean } from '../../utils';
import { BaseField } from '../base';
import BooleanFieldMixin from './BooleanFieldMixin.js';

/**
 * Field to store bool value
 */
class BooleanField extends BaseField {
    /**
     * Custom method for toInner and toRepresent methods.
     * @param {*} value
     * @private
     */
    _toBoolean(value) {
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
     * @param data
     * @return {boolean}
     */
    toInner(data) {
        return this._toBoolean(super.toInner(data));
    }

    /**
     * @param data
     * @return {boolean}
     */
    toRepresent(data) {
        return this._toBoolean(super.toRepresent(data));
    }

    getInitialValue() {
        return super.getInitialValue({ requireValue: true });
    }

    /**
     * @return {boolean}
     */
    getEmptyValue() {
        return false;
    }

    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return [BooleanFieldMixin];
    }

    getContainerCssClasses(data) {
        const value = this.getValue(data);
        if (value !== undefined) {
            return [this.formatContainerCssClass(String(value))];
        }
    }
}

export default BooleanField;
