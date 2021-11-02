import { BaseField, BaseFieldMixin } from './base';
import { registerHook } from '../utils';

/**
 * @vue/component
 */
export const StaticValueFieldMixin = {
    mixins: [BaseFieldMixin],
    computed: {
        staticValue() {
            return typeof this.field.staticValue === 'function'
                ? this.field.staticValue(this.data)
                : this.field.staticValue;
        },
        dataWithStaticValue() {
            return Object.assign({}, this.data, { [this.field.name]: this.staticValue });
        },
    },
    render(h) {
        return h(this.field.realField.component, {
            props: {
                field: this.field.realField,
                data: this.dataWithStaticValue,
                type: this.type,
            },
            on: this.$listeners,
        });
    },
};

export class StaticValueField extends BaseField {
    constructor(options) {
        super(options);
        this.staticValue = this.props.staticValue;
        registerHook('app.beforeInit', this.resolveRealField.bind(this));
    }

    resolveRealField() {
        if (this.props.realField instanceof BaseField) {
            this.realField = this.props.realField;
        } else {
            this.realField = this.constructor.app.fieldsResolver.resolveField(
                this.props.realField,
                this.name,
            );
        }
    }

    static get mixins() {
        return [StaticValueFieldMixin];
    }
}
