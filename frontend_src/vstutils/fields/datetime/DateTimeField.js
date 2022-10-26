import moment from 'moment-timezone';
import { BaseField } from '../base';
import DateTimeFieldMixin from './DateTimeFieldMixin.js';

/**
 * Date-time guiField class.
 */
class DateTimeField extends BaseField {
    constructor(options) {
        super(options);

        this.dateRepresentFormat = this.props.format || 'llll';
    }
    toInner(data) {
        const value = super.toInner(data);
        if (!value) return;
        return moment
            .tz(value, moment.tz.guess())
            .tz(this.constructor?.app?.api?.getTimeZone() || 'UTC')
            .format();
    }

    toRepresent(data) {
        const value = super.toRepresent(data);
        if (!value) return;
        return moment.tz(value, this.constructor?.app?.api?.getTimeZone() || 'UTC').tz(moment.tz.guess());
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return [DateTimeFieldMixin];
    }
}

export default DateTimeField;
