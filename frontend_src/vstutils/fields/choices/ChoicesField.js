import { StringField } from '../text';
import ChoicesFieldMixin from './ChoicesFieldMixin.js';

/**
 * Choices guiField class.
 */
class ChoicesField extends StringField {
    constructor(options) {
        super(options);
        const props = options.additionalProperties || {};

        this.enum = options.enum;
        this.fieldForEnum = props.fieldForEnum;

        this.templateResult = props.templateResult;
        this.templateSelection = props.templateSelection;
    }

    /**
     * @return {string}
     */
    getInitialValue() {
        if (this.hasDefault) {
            return this.default;
        }
        if (this.enum) {
            return this.enum[0];
        }
        return null;
    }

    /**
     * Redefinition of string guiField static property 'mixins'.
     */
    static get mixins() {
        return [ChoicesFieldMixin];
    }
}

export default ChoicesField;
