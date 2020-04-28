import { StringField } from '../text';
import AutocompleteFieldMixin from './AutocompleteFieldMixin.js';

/**
 * Autocomplete guiField class.
 */
class AutocompleteField extends StringField {
    /**
     * Redefinition of base guiField method _insertTestValue_imitateEvent.
     */
    _insertTestValue_imitateEvent(el) {
        el.dispatchEvent(new Event('blur'));
    }
    /**
     * Redefinition of string guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(AutocompleteFieldMixin);
    }
}

export default AutocompleteField;
