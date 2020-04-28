import { NamedBinaryFileFieldContent } from '../named-binary-file';

/**
 * Mixin for readonly and editable multiplenamedbinfile field.
 */
export const MultipleNamedBinaryFileFieldContent = {
    mixins: [NamedBinaryFileFieldContent],
    computed: {
        val() {
            if (this.value && Array.isArray(this.value) && this.value.length > 0) {
                return this.$options.filters.capitalize(this.$tc(this.translate_string, this.value.length));
            }

            return this.title_for_empty_value;
        },
    },
};

export default MultipleNamedBinaryFileFieldContent;
