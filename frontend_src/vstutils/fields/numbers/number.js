import { BaseField, BaseFieldContentEdit, BaseFieldMixin } from '../base';
import { hasOwnProp } from '../../utils/todo';
import { NumberArrayFieldMixin } from './array';

export const NumberFieldContentMixin = {
    methods: {
        setValue(value) {
            if (this.field.isValueValid(value)) {
                this.$emit('set-value', value);
            } else {
                this.$refs.input.value = this.value ?? '';
            }
        },
    },
};

export const NumberFieldMixin = {
    mixins: [BaseFieldMixin],
    components: {
        field_content_edit: {
            mixins: [BaseFieldContentEdit, NumberFieldContentMixin],
        },
    },
};

/**
 * Field to store numbers
 */
export class NumberField extends BaseField {
    constructor(options) {
        super(options);
        this.signed = hasOwnProp(this.props, 'signed') ? this.props.signed : true;
    }
    /**
     * Redefinition of base guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        let value = data[this.options.name];

        if (value === undefined) {
            return;
        }
        if (value === null || value === '') return null;

        const strValue = String(value);
        if (!this.isValueValid(strValue)) {
            console.error('Error in number.toInner()');
            return;
        }

        return Number(value);
    }

    isNumber(value) {
        return (!isNaN(Number(value)) && value.slice(-1) !== ' ') || (this.signed && value === '-');
    }
    isValueValid(value) {
        return this.isNumber(value);
    }

    getEmptyValue() {
        return null;
    }

    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return [NumberFieldMixin];
    }

    getArrayComponent() {
        return NumberArrayFieldMixin;
    }
}
