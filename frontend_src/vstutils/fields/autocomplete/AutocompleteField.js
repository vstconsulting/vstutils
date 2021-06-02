import { StringField } from '../text';
import AutocompleteFieldMixin from './AutocompleteFieldMixin.js';

/**
 * Autocomplete guiField class.
 */
class AutocompleteField extends StringField {
    /**
     * Redefinition of string guiField static property 'mixins'.
     */
    static get mixins() {
        return [AutocompleteFieldMixin];
    }
}

export default AutocompleteField;
