/**
 * Mixin for editable fk_autocomplete gui_field(input value area).
 */
const FKAutocompleteFieldContentEdit = {
    computed: {
        /**
         * Property, that returns value to represent.
         * @private
         */
        _val() {
            if (!this.value) {
                return;
            }

            if (typeof this.value == 'object') {
                if (this.value.value !== undefined) {
                    return this.value.value;
                } else if (this.value.prefetch_value !== undefined) {
                    return this.value.prefetch_value;
                }
            }

            return this.value;
        },
        /**
         * Property, that returns value to represent.
         */
        val() {
            return this._val;
        },
    },
    methods: {
        /**
         * Method, that saves in store value, typed by user.
         * @param {*} value
         */
        setValueByHandsInStore(value) {
            if (this.value && this.value.prefetch_value && this.value.prefetch_value == value) {
                return;
            }

            let obj = {
                value: value,
                prefetch_value: value,
            };

            this.$emit('proxyEvent', 'setValueInStore', obj);
        },
    },
};

export default FKAutocompleteFieldContentEdit;
