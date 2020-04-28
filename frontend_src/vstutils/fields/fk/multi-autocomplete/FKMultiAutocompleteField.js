import { FKAutocompleteField } from '../autocomplete';
import FKMultiAutocompleteFieldMixin from './FKMultiAutocompleteFieldMixin.js';

/**
 * FK_multi_autocomplete guiField class.
 */
class FKMultiAutocompleteField extends FKAutocompleteField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(FKMultiAutocompleteFieldMixin);
    }
}

export default FKMultiAutocompleteField;
