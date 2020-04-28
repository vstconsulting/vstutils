import { _translate } from '../../utils';
import { pop_up_msg } from '../../popUp';
import StringField from './StringField.js';

/**
 * String id guiField class.
 * This class if for string fields, that is supposed to be used in URLs as 'id' key.
 * This class has additional validation, that checks, that field's value is not equal to some other URL keys:
 * - new;
 * - edit;
 * - remove.
 */
class StringIDField extends StringField {
    /**
     * Custom method for validateValue method.
     * @param {object} data
     */
    validateValueCustom(data = {}) {
        let value = data[this.options.name];
        let samples = pop_up_msg.field.error;
        let title = (this.options.title || this.options.name).toLowerCase();
        let exclude_values = ['new', 'edit', 'remove'];
        let $t = _translate;

        if (value && exclude_values.includes(value)) {
            throw {
                error: 'validation',
                message: $t(samples.invalid).format([value, $t(title)]),
            };
        }

        return value;
    }
    /**
     * Custom method for toInner and toRepresent methods.
     * @param {object} data
     */
    _getValue(data = {}) {
        let value = data[this.options.name];

        if (value !== undefined && value !== null) {
            return String(value).replace(/-/g, '_');
        }
    }
    /**
     * Redefinition of 'toInner' method of string guiField.
     */
    toInner(data = {}) {
        return this._getValue(data);
    }
    /**
     * Redefinition of 'toInner' method of string guiField.
     */
    toRepresent(data = {}) {
        return this._getValue(data);
    }
}

export default StringIDField;
