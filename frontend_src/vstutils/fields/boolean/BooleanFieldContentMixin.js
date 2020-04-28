/**
 * Mixin for boolean gui_field content(input value area).
 */
const BooleanFieldContentMixin = {
    data() {
        return {
            class_list: ['form-control', 'boolean-select'],
        };
    },
    computed: {
        selected: function () {
            return this.value ? 'selected' : '';
        },

        text() {
            return this.value ? 'yes' : 'no';
        },

        classes() {
            return [].concat(this.class_list, this.selected, this.additional_classes);
        },

        additional_classes() {
            return [];
        },
    },
};

export default BooleanFieldContentMixin;
