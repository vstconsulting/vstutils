import { defineComponent } from 'vue';
import { BaseField, BaseFieldContentEdit, BaseFieldMixin, FieldOptions, FieldXOptions } from '../base';
import { NumberArrayFieldMixin } from './array';
import { RepresentData } from './../../utils';
import { pop_up_msg } from '../../popUp';
import { i18n } from '../../translation';

export const NumberFieldContentMixin = {
    methods: {
        setValue(this: any, value: any) {
            if (this.field.isValueValid(value)) {
                this.$emit('set-value', value);
            } else {
                this.$refs.input.value = this.value ?? '';
            }
        },
    },
};

export const NumberFieldMixin = defineComponent({
    mixins: [BaseFieldMixin],
    components: {
        field_content_edit: {
            mixins: [BaseFieldContentEdit, NumberFieldContentMixin],
        },
    },
});

interface XOptions extends FieldXOptions {
    signed?: boolean;
}

/**
 * Field to store numbers
 */
export class NumberField extends BaseField<number, number, XOptions> {
    signed?: boolean;

    constructor(options: FieldOptions<XOptions, number>) {
        super(options);
        this.signed = this.props?.signed ?? true;
    }

    validateValue(data: RepresentData): number | null | undefined {
        const value = super.validateValue(data);
        const samples = pop_up_msg.field.error;

        if (typeof value === 'number') {
            const maximum = this.getNumberMaximum(data);
            if (maximum && value > maximum) {
                throw {
                    error: 'validation',
                    message: i18n.ts(samples.max).format([maximum]),
                };
            }

            const minimum = this.getNumberMinimum(data);
            if (minimum && value < minimum) {
                throw {
                    error: 'validation',
                    message: i18n.ts(samples.min).format([minimum]),
                };
            }
        }

        return value;
    }

    getNumberMinimum(data: RepresentData): number | undefined | null {
        if (this.options['x-dynamic-minimum']) {
            return data[this.options['x-dynamic-minimum']] as number | undefined | null;
        }
        return this.options.minimum;
    }

    getNumberMaximum(data: RepresentData): number | undefined | null {
        if (this.options['x-dynamic-maximum']) {
            return data[this.options['x-dynamic-maximum']] as number | undefined | null;
        }
        return this.options.maximum;
    }

    toInner(data: RepresentData) {
        const value = this.getValue(data) as number | undefined | null | '';

        if (value === undefined) {
            return;
        }
        if (value === null || value === '') return null;

        const strValue = String(value);
        if (!this.isValueValid(strValue)) {
            console.error('Error in number.toInner()');
            return;
        }

        return Number(value);
    }

    isNumber(value: string) {
        return (!isNaN(Number(value)) && value.slice(-1) !== ' ') || (this.signed && value === '-');
    }
    isValueValid(value: string) {
        return this.isNumber(value);
    }

    getEmptyValue() {
        return null;
    }

    static get mixins() {
        return [NumberFieldMixin];
    }

    getArrayComponent() {
        return NumberArrayFieldMixin;
    }
}
