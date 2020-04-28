import { FKField } from '../fk/fk';
import MultiselectFieldMixin from './MultiselectFieldMixin.js';

/**
 * MULTISELECT guiField class.
 * FK field, that allows to select several objects ta once.
 */
class MultiselectField extends FKField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(MultiselectFieldMixin);
    }
    /**
     * Redefinition of 'prefetchDataOrNot' method of FK guiField.
     * @param {object} data
     */
    prefetchDataOrNot(data = {}) {
        /* jshint unused: false */
        return false;
    }
    /**
     * Redefinition of 'toInner' method of base guiField.
     * @param {object} data
     */
    toInner(data = {}) {
        let value = data[this.options.name];

        if (value && typeof value == 'object' && Array.isArray(value)) {
            return value
                .map((item) => {
                    return item.value;
                })
                .join(this.options.additionalProperties.view_separator);
        }

        return value;
    }
    /**
     * Redefinition of 'toRepresent' method of base guiField.
     * @param {object} data
     */
    toRepresent(data = {}) {
        let value = data[this.options.name];

        if (value && typeof value == 'object' && Array.isArray(value)) {
            return value
                .map((item) => {
                    return item.prefetch_value;
                })
                .join(this.options.additionalProperties.view_separator);
        }

        return value;
    }
}

export default MultiselectField;
