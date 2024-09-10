import { stringToBoolean } from '../../utils';
import { BaseField } from '../base';
import BooleanFieldMixin from './BooleanFieldMixin.js';
import CheckboxBooleanFieldComponent from './CheckboxBooleanField.vue';

/**
 * Field to store bool value
 */
export class BooleanField extends BaseField {
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

    getComponent() {
        return BooleanFieldMixin;
    }

    getContainerCssClasses(data) {
        const value = this.getValue(data);
        if (value !== undefined) {
            return [this.formatContainerCssClass(String(value))];
        }
    }
}

export default BooleanField;

export class CheckboxBooleanField extends BooleanField {
    getComponent() {
        return CheckboxBooleanFieldComponent;
    }
}
