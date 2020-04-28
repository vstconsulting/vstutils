/**
 * Mixin, that adds hideField method, that is used in tables.
 */
const HideFieldInTableMixin = {
    methods: {
        /**
         * Method, that returns true, if field should be hidden.
         * Otherwise, it returns false.
         * @param {object} field Field object.
         */
        hideField(field) {
            if (field.options && field.options.hidden) {
                return true;
            }

            if (field.options && field.options.is_pk) {
                return true;
            }

            return false;
        },
    },
    computed: {
        fieldsToShow() {
            return Object.values(this.fields).filter((field) => !this.hideField(field));
        },
    },
};

export default HideFieldInTableMixin;
