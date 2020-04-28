import { StringField } from '../text';
import PasswordFieldMixin from './PasswordFieldMixin.js';

/**
 * Password guiField class.
 */
class PasswordField extends StringField {
    /**
     * Redefinition of string guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(PasswordFieldMixin);
    }
}

export default PasswordField;
