import { FKField } from '../fk/fk';
import MultiselectFieldMixin from './MultiselectFieldMixin.js';

/**
 * MULTISELECT guiField class.
 * FK field, that allows to select several objects ta once.
 */
class MultiselectField extends FKField {
    constructor(options) {
        super(options);

        this.fetchData = false;

        this.viewSeparator = options.additionalProperties.view_separator;
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(MultiselectFieldMixin);
    }

    toInner(data) {
        const value = data[this.name];
        if (value && Array.isArray(value)) {
            return value.map((item) => item.value).join(this.viewSeparator);
        }
        return value;
    }

    toRepresent(data) {
        const value = data?.[this.name];
        if (value && Array.isArray(value)) {
            return value.map((item) => item.prefetch_value).join(this.viewSeparator);
        }
        return value;
    }
}

export default MultiselectField;
