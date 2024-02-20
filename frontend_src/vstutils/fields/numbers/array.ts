import { defineComponent } from 'vue';

import { StringArrayFieldEdit, StringArrayFieldMixin } from '@/vstutils/fields/text/string-array';

function validateNumber(text: string) {
    const number = Number.parseFloat(text.trim());
    if (Number.isNaN(number)) {
        return undefined;
    }
    return number;
}

export const NumberArrayFieldEdit = defineComponent({
    name: 'NumberArrayFieldEdit',
    mixins: [StringArrayFieldEdit],
    data() {
        return {
            itemsValidator: validateNumber,
            inputmode: 'decimal',
        };
    },
});

export const NumberArrayFieldMixin = defineComponent({
    components: {
        field_content_edit: NumberArrayFieldEdit,
    },
    mixins: [StringArrayFieldMixin],
});

function validateInteger(text: string) {
    const number = Number.parseInt(text.trim());
    if (Number.isNaN(number)) {
        return undefined;
    }
    return number;
}

export const IntegerArrayFieldEdit = defineComponent({
    name: 'IntegerArrayFieldEdit',
    mixins: [StringArrayFieldEdit],
    data() {
        return {
            itemsValidator: validateInteger,
            inputmode: 'numeric',
        };
    },
});

export const IntegerArrayFieldMixin = defineComponent({
    components: {
        field_content_edit: IntegerArrayFieldEdit,
    },
    mixins: [StringArrayFieldMixin],
});
