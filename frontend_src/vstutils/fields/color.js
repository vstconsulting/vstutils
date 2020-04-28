import { BaseField, BaseFieldContentReadonlyMixin, BaseFieldContentEdit } from './base';

/**
 * Mixin for color gui_field content(input value area).
 */
const ColorFieldContentMixin = {
    data() {
        return {
            input_type: 'color',
        };
    },
};

const ColorFieldMixin = {
    components: {
        field_content_readonly: {
            mixins: [BaseFieldContentReadonlyMixin, ColorFieldContentMixin],
        },
        field_content_edit: {
            mixins: [BaseFieldContentEdit, ColorFieldContentMixin],
        },
    },
};

/**
 * Color guiField class.
 */
class ColorField extends BaseField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(ColorFieldMixin);
    }
    /**
     * Custom method for toInner and toRepresent methods.
     * @param {object} data
     */
    _getValue(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return '#000000';
        }

        return value;
    }
    /**
     * Redefinition of base guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        return this._getValue(data);
    }
    /**
     * Redefinition of base guiField method toRepresent.
     * @param {object} data
     */
    toRepresent(data = {}) {
        return this._getValue(data);
    }
}

export { ColorFieldContentMixin, ColorFieldMixin, ColorField };
