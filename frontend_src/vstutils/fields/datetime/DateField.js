import moment from 'moment';
import { BaseField } from '../base';
import DateFieldMixin from './DateFieldMixin.js';

/**
 * Date guiField class.
 */
class DateField extends BaseField {
    /**
     * Custom method for toInner and toRepresent methods.
     * @param {object} data
     */
    _getValue(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return;
        }

        return moment(value).format('YYYY-MM-DD');
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
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(DateFieldMixin);
    }
}

export default DateField;
