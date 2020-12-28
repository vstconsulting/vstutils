import $ from 'jquery';

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
            /**
             * Names of additional attributes of field's input element.
             */
            attrs_names: {
                // readOnly: ['readonly', 'disabled'],
                minLength: ['minlength'],
                maxLength: ['maxlength'],
                min: ['min'],
                max: ['max'],
                required: ['required'],
            },
            /**
             * Default values of field's input attributes.
             */
            default_field_attrs: {},
        };
    },
    computed: {
        /**
         * Property, that returns array with properties,
         * which store values of additional attributes.
         */
        props_with_attrs() {
            return [this.default_field_attrs, this.field.options];
        },
        /**
         * Property, that returns object with values of additional attributes.
         */
        attrs() {
            let attrs = {};

            this.props_with_attrs.forEach((prop) => {
                attrs = $.extend(true, attrs, this.getAttrsFromProp(prop));
            });

            return attrs;
        },
        /**
         * Property, that returns value of 'aria-label' attribute.
         */
        aria_label() {
            return this.field.options.title || this.field.options.name + 'field';
        },
    },
    methods: {
        /**
         * Method, that forms additional attributes objects based on prop's value.
         * @param {object} prop Object with values of additional attributes.
         */
        getAttrsFromProp(prop) {
            let attrs = {};

            for (let [key, value] of Object.entries(this.attrs_names)) {
                if (prop[key] === undefined) {
                    continue;
                }

                value.forEach((attr) => {
                    attrs[attr] = prop[key];
                });
            }

            return attrs;
        },
    },
};

export default BaseFieldContentMixin;
