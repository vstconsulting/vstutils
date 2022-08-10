import { StringArrayFieldEdit, StringArrayFieldMixin } from './string.js';

function validateNumber(text) {
    const number = Number.parseFloat(text.trim());
    if (Number.isNaN(number)) {
        return undefined;
    }
    return number;
}

/** @vue/component */
export const NumberArrayFieldEdit = {
    name: 'NumberArrayFieldEdit',
    mixins: [StringArrayFieldEdit],
    data() {
        return {
            itemsValidator: validateNumber,
        };
    },
};

/** @vue/component */
export const NumberArrayFieldMixin = {
    components: {
        field_content_edit: NumberArrayFieldEdit,
    },
    mixins: [StringArrayFieldMixin],
};

function validateInteger(text) {
    const number = Number.parseInt(text.trim());
    if (Number.isNaN(number)) {
        return undefined;
    }
    return number;
}

/** @vue/component */
export const IntegerArrayFieldEdit = {
    name: 'IntegerArrayFieldEdit',
    mixins: [StringArrayFieldEdit],
    data() {
        return {
            itemsValidator: validateInteger,
        };
    },
};

/** @vue/component */
export const IntegerArrayFieldMixin = {
    components: {
        field_content_edit: IntegerArrayFieldEdit,
    },
    mixins: [StringArrayFieldMixin],
};
