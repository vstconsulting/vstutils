import moment from 'moment';
import { BaseField } from '../base';
import DateTimeFieldMixin from './DateTimeFieldMixin.js';

/**
 * Date_time guiField class.
 */
class DateTimeField extends BaseField {
    /**
     * Redefinition of base guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return;
        }

        return moment.tz(value, window.app.api.getTimeZone()).format();
    }
    /**
     * Redefinition of base guiField method toRepresent.
     * @param {object} data
     */
    toRepresent(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return;
        }

        let m = moment(moment.tz(value, window.app.api.getTimeZone())).tz(moment.tz.guess());

        return m.format('YYYY-MM-DD') + 'T' + m.format('HH:mm');
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(DateTimeFieldMixin);
    }
}

export default DateTimeField;
