import { BaseField } from '../base';
import ButtonFieldMixin from './ButtonFieldMixin.vue';

/**
 * Button guiField class.
 */
class ButtonField extends BaseField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(ButtonFieldMixin);
    }
}

export default ButtonField;
