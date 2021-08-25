import { BaseField, BaseFieldContentEdit, BaseFieldMixin } from '../base';

export const NumberFieldContentMixin = {
    data() {
        return {
            inputType: 'number',
        };
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
 * Field to store integers
 */
export class NumberField extends BaseField {
    /**
     * Redefinition of base guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        let value = data[this.options.name];

        if (value === undefined) {
            return;
        }

        let val = Number(value);

        if (isNaN(val)) {
            console.error('Error in number.toInner()');
            return;
        }

        return val;
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
}
