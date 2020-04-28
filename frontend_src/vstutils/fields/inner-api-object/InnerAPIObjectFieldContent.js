/**
 * Mixin for content components of inner_api_objec field.
 */
const InnerAPIObjectFieldContent = {
    methods: {
        /**
         * Property, that returns true if item, stores more, than 1 field.
         * @param {object} item Fields collector.
         */
        more_than_one_field(item) {
            return Object.keys(item).length > 1;
        },
        /**
         * Property, that returns value of realField.
         * @param {object} item Fields collector.
         * @param {object} field RealField.
         */
        realFieldValue(item, field) {
            /* jshint unused: false */
            if (this.value === undefined) {
                return;
            }

            if (this.value[item] !== undefined) {
                return this.value[item];
            }
        },
    },
};

export default InnerAPIObjectFieldContent;
