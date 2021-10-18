import { MaskedField, MaskedFieldMixin } from '../../text/masked';

export const DecimalFieldMixin = {
    mixins: [MaskedFieldMixin],
};

export class DecimalField extends MaskedField {
    constructor(options) {
        super(options);
        this.decimalPlaces = this.props.decimal_places || 2;
        this.maxDigits = this.props.max_digits || 10;
        const maskRegExp = new RegExp(
            '^-?\\d{0,' + (this.maxDigits - this.decimalPlaces) + '}(\\.\\d{0,' + this.decimalPlaces + '})?$',
        );
        this.mask = {
            mask: maskRegExp,
        };
    }
    toInner(data = {}) {
        let value = data[this.options.name];

        if (value === undefined) {
            return;
        }
        if (value === '') return null;

        let val = Number(value);

        if (isNaN(val)) {
            console.error('Error in decimal.toInner()');
            return;
        }

        return val;
    }

    toRepresent(data) {
        let value = data[this.name];
        if (value === null) return '';
        return value;
    }

    static get mixins() {
        return [DecimalFieldMixin];
    }
}
