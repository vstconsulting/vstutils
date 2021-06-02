import moment from 'moment';
import { BaseField } from '../base';
import DateTimeFieldMixin from './DateTimeFieldMixin.js';

/**
 * Date-time guiField class.
 */
class DateTimeField extends BaseField {
    toInner(data) {
        const value = super.toInner(data);
        if (!value) return;
        return moment.tz(value, moment.tz.guess()).tz(this.constructor.app.api.getTimeZone()).format();
    }

    toRepresent(data) {
        const value = super.toRepresent(data);
        if (!value) return;
        return moment.tz(value, moment.tz.guess());
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return [DateTimeFieldMixin];
    }
}

export default DateTimeField;
