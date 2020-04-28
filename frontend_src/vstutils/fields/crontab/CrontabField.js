import { BaseField } from '../base';
import CrontabFieldMixin from './CrontabFieldMixin.js';

/**
 * Crontab guiField class.
 */
class CrontabField extends BaseField {
    /**
     * Custom method for toInner and toRepresent methods.
     * @param {object} data
     */
    _getValue(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return '* * * * *';
        }

        return value;
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
     * Redefinition of base guiField method _insertTestValue_imitateEvent.
     */
    _insertTestValue_imitateEvent(el) {
        el.dispatchEvent(new Event('blur'));
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(CrontabFieldMixin);
    }
}

export default CrontabField;
