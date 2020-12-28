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
    _getValue(value) {
        if (!value) {
            return;
        }
        return moment(value).format('YYYY-MM-DD');
    }

    toInner(data) {
        return this._getValue(super.toInner(data));
    }

    toRepresent(data) {
        return this._getValue(super.toInner(data));
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(DateFieldMixin);
    }
}

export default DateField;
