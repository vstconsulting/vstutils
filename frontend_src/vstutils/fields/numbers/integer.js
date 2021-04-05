import { BaseField, BaseFieldContentEdit, BaseFieldMixin } from '../base';

export const IntegerFieldContentMixin = {
    data() {
        return {
            inputType: 'number',
        };
    },
};

export const IntegerFieldMixin = {
    mixins: [BaseFieldMixin],
    components: {
        field_content_edit: {
            mixins: [BaseFieldContentEdit, IntegerFieldContentMixin],
        },
    },
};

/**
 * Field to store integers
 */
export class IntegerField extends BaseField {
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
            console.error('Error in integer.toInner()');
            return;
        }

        return val;
    }

    getInitialValue() {
        return null;
    }

    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return [IntegerFieldMixin];
    }
}
