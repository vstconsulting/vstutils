import { IntegerField } from '../numbers';
import TimeIntervalFieldMixin from './TimeIntervalFieldMixin.js';

/**
 * Time_interval guiField class.
 * Field that gets time in milliseconds and convert it into seconds before render.
 * Before sending data to API it converts time from seconds to milliseconds.
 */
class TimeIntervalField extends IntegerField {
    /**
     * Redefinition of base guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return;
        }

        if (typeof value == 'object' && value.value) {
            return value.value;
        }

        return value;
    }
    /**
     * Method, that converse time in seconds to time in milliseconds.
     * @param {object} data Object with fields values.
     * @private
     */
    _toInner(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return;
        }

        return value * 1000;
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

        if (typeof value == 'object' && value.represent_value) {
            return value.represent_value;
        }

        return value / 1000;
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(TimeIntervalFieldMixin);
    }
}

export default TimeIntervalField;
