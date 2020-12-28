import { BaseField } from '../base';
import IntegerFieldMixin from './IntegerFieldMixin';

/**
 * Integer guiField class.
 */
class IntegerField extends BaseField {
    /**
     * Redefinition of base guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        let value = data[this.options.name];

        if (value === undefined) {
            return;
        }

        let val = Number(value);

        if (isNaN(val)) {
            console.error('Error in integer.toInner()');
            return;
        }

        return val;
    }

    getInitialValue() {
        return null;
    }

    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(IntegerFieldMixin);
    }
}

export default IntegerField;
