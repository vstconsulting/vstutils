/**
 * Mixin for boolean gui_field content(input value area).
 */
const BooleanFieldContentMixin = {
    computed: {
        selected: function () {
            return this.value ? 'selected' : '';
        },

        classes() {
            return ['boolean-select'].concat(this.class_list, this.selected, this.additional_classes);
        },

        additional_classes() {
            return [];
        },
    },
};

export default BooleanFieldContentMixin;
