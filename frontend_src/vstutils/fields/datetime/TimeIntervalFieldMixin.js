import { IntegerFieldContentMixin } from '../numbers/integer';
import { BaseFieldContentEdit } from '../base';

const TimeIntervalFieldMixin = {
    methods: {
        /**
         * Redefinition of 'handleValue' method of base guiField.
         * @param {object} data Object with values of current field
         * and fields from the same fields_wrapper.
         */
        handleValue(data = {}) {
            let value = data[this.field.options.name];

            if (value === undefined) {
                return;
            }

            return {
                value: this.field._toInner(data),
                represent_value: value,
            };
        },
    },
    components: {
        field_content_edit: {
            mixins: [BaseFieldContentEdit, IntegerFieldContentMixin],
            data() {
                return {
                    default_field_attrs: { min: 0 },
                };
            },
        },
    },
};

export default TimeIntervalFieldMixin;
