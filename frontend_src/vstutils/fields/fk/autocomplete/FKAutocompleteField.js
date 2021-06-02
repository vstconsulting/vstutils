import { FKField } from '../fk';
import FKAutocompleteFieldMixin from './FKAutocompleteFieldMixin.js';

/**
 * FkField with autocomplete feature for GUI.
 */
class FKAutocompleteField extends FKField {
    constructor(options) {
        super(options);
        this.makeLink = false;
    }

    static get mixins() {
        return [FKAutocompleteFieldMixin];
    }

    getInitialValue() {
        return '';
    }
}

export default FKAutocompleteField;
