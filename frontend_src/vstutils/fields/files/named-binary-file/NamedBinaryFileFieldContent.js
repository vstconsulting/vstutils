/**
 * Mixin for readonly and editable namedbinfile field.
 */
export const NamedBinaryFileFieldContent = {
    data() {
        return {
            translate_string: 'file n selected',
        };
    },
    computed: {
        title_for_empty_value() {
            return this.$options.filters.capitalize(this.$tc(this.translate_string, 0));
        },

        val() {
            if (this.value && typeof this.value == 'object' && this.value.name) {
                return this.value.name;
            }

            return this.title_for_empty_value;
        },
    },
};

export default NamedBinaryFileFieldContent;
