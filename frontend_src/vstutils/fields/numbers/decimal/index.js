import { MaskedField, MaskedFieldMixin } from '../../text/masked';

export const DecimalFieldMixin = {
    mixins: [MaskedFieldMixin],
};

export class DecimalField extends MaskedField {
    constructor(options) {
        super(options);
        this.decimalPlaces = this.props.decimal_places;
        this.maxDigits = this.props.max_digits;
        const maskRegExp = new RegExp(
            '^-?\\d{0,' + (this.maxDigits - this.decimalPlaces) + '}(\\.\\d{0,' + this.decimalPlaces + '})?$',
        );
        this.mask = {
            mask: maskRegExp,
        };
    }

    static get mixins() {
        return [DecimalFieldMixin];
    }

    getInitialValue() {
        return null;
    }
}
