/**
 * Mixin for some inner component of gui_field.
 */
const BaseFieldInnerComponentMixin = {
    name: 'BaseFieldInnerComponentMixin',
    props: ['field', 'value', 'data'],
    data() {
        return {
            /**
             * Array with CSS class names, that should be added to the component.
             */
            class_list: [],
            /**
             * Dict with CSS style properties (key, value), that should be added to the component.
             */
            styles_dict: {},
            prependText: this.field.prependText,
            appendText: this.field.appendText,
        };
    },
    computed: {
        /**
         * Property, that returns string with component's CSS class names.
         */
        classes() {
            return this.class_list.join(' ');
        },
        /**
         * Property, that returns dict with CSS style properties.
         */
        styles() {
            return this.styles_dict;
        },
    },
};

export default BaseFieldInnerComponentMixin;
