export const BaseWidgetMixin = {
    name: 'base_widget_mixin',
    props: {
        /**
         * Property, that stores widget object - object with widget settings.
         */
        item: Object,
        /**
         * Property, that stores widget's value.
         */
        value: {
            default: () => {},
        },
    },
};

/**
 * Base mixin for 'body' child component of 'card widget' components.
 */
export const CardWidgetBodyMixin = {
    name: 'card_widget_body_mixin',
    mixins: [BaseWidgetMixin],
};
