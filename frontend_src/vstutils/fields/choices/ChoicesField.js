import { StringField } from '../text';
import ChoicesFieldMixin from './ChoicesFieldMixin.js';

/**
 * Choices guiField class.
 */
class ChoicesField extends StringField {
    constructor(options) {
        super(options);
        const props = options.additionalProperties || {};

        this.enum = options.enum || null;
        this.fieldForEnum = props.fieldForEnum;

        this.templateResult = props.templateResult;
        this.templateSelection = props.templateSelection;
    }

    getEmptyValue() {
        if (this.enum) {
            return this.enum[0];
        }
        return null;
    }

    prepareEnumData(data) {
        if (typeof data === 'string' && data.length > 0) {
            // 'val1,val2'
            return data.split(',').map((val) => ({ id: val, text: val }));
        } else if (Array.isArray(data) && data.length > 0) {
            if (Array.isArray(data[0])) {
                // [['val1', 'Val 1'], ['val2', 'Val 2']]
                return data.map(([id, text]) => ({ id, text }));
            } else {
                // ['val1', 'val2']
                return data.map((val) => ({ id: val, text: val }));
            }
        }
        return [];
    }

    /**
     * Redefinition of string guiField static property 'mixins'.
     */
    static get mixins() {
        return [ChoicesFieldMixin];
    }
}

export default ChoicesField;
