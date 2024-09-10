import { Component, defineComponent } from 'vue';
import { BaseFieldContentEdit } from '../base';
import { NumberField, NumberFieldContentMixin, NumberFieldMixin } from './number';
import { IntegerArrayFieldMixin } from './array';
import PlusMinusIntegerFieldComponent from './PlusMinusIntegerField.vue';

export const IntegerFieldContentMixin = {
    mixins: [NumberFieldContentMixin],
};

export const IntegerFieldMixin = defineComponent({
    mixins: [NumberFieldMixin],
    components: {
        field_content_edit: {
            mixins: [BaseFieldContentEdit, IntegerFieldContentMixin],
        },
    },
});

/**
 * Field to store integers
 */
export class IntegerField extends NumberField {
    isValueValid(value: string) {
        return this.isNumber(value) && !value.includes('.');
    }

    override getComponent(): Component {
        return IntegerFieldMixin;
    }

    getArrayComponent() {
        return IntegerArrayFieldMixin;
    }
}

export class PlusMinusIntegerField extends IntegerField {
    override getComponent(): Component {
        return PlusMinusIntegerFieldComponent;
    }
}
