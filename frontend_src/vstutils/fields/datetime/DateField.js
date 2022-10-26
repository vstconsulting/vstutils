import moment from 'moment';
import { BaseField } from '../base';
import DateFieldMixin from './DateFieldMixin.js';

/**
 * Date guiField class.
 */
class DateField extends BaseField {
    constructor(options) {
        super(options);

        this.dateInnerFormat = 'YYYY-MM-DD';
        this.dateRepresentFormat = this.props.format || this.dateInnerFormat;
    }
    /**
     * Custom method for toInner and toRepresent methods.
     * @param {object} data
     */
    _getValue(value, format) {
        if (!value) {
            return;
        }
        return moment(value).format(format);
    }

    toInner(data) {
        return this._getValue(super.toInner(data), this.dateInnerFormat);
    }

    toRepresent(data) {
        return this._getValue(super.toInner(data), this.dateRepresentFormat);
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(DateFieldMixin);
    }
}

export default DateField;
