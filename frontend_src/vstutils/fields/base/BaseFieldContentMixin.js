import { getInputAttrs } from './composables';

/**
 * Mixin for gui_fields' content(input value area).
 */
const BaseFieldContentMixin = {
    data() {
        return {
            /**
             * Type of field's input element (if it exists).
             */
            inputType: 'text',
        };
    },
    computed: {
        /**
         * Property, that returns object with values of additional attributes.
         */
        attrs() {
            return getInputAttrs(this.field);
        },
        /**
         * Property, that returns value of 'aria-label' attribute.
         */
        aria_label() {
            return this.field.title;
        },
    },
};

export default BaseFieldContentMixin;
