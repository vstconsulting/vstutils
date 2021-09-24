import { StringField } from '../text';
import ChoicesFieldMixin from './ChoicesFieldMixin.js';

/**
 * Choices guiField class.
 */
class ChoicesField extends StringField {
    constructor(options) {
        super(options);
        this.enum = options.enum || null;
        this.fieldForEnum = this.props.fieldForEnum;

        this.templateResult = this.props.templateResult;
        this.templateSelection = this.props.templateSelection;
    }

    getEmptyValue() {
        if (this.enum) {
            return this.enum[0];
        }
        return null;
    }

    prepareEnumItem(item) {
        if (typeof item === 'string') {
            return { id: item, text: item };
        }
        if (Array.isArray(item)) {
            // Example: [['val1', 'Val 1'], ['val2', 'Val 2']]
            return { id: item[0], text: item[1] };
        }
        if (typeof item === 'object') {
            if (typeof item.getViewFieldString === 'function') {
                const val = item.getViewFieldString();
                return { id: val, text: val };
            }
            if (item.value && item.prefetch_value) {
                // Legacy object format (value and prefetchValue properties)
                return { id: item.value, text: item.prefetch_value };
            }
        }

        this._error(`Can not handle option "${item}"`);
    }

    prepareEnumData(data = this.enum) {
        if (typeof data === 'string' && data.length > 0) {
            // Example: 'val1,val2'
            return data.split(',').map((val) => ({ id: val, text: val }));
        }
        if (Array.isArray(data)) {
            return data.map((item) => this.prepareEnumItem(item)).filter(Boolean);
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
