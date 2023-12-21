import { BaseFieldContentEdit, BaseFieldMixin } from '../../base';
import { FloatField } from '../float.js';
import Stars from './Stars.vue';
import Slider from './Slider.vue';
import FaIcon from './FaIcon.vue';

const COMPONENTS = {
    stars: Stars,
    slider: Slider,
    fa_icon: FaIcon,
};

/**
 * @vue/component
 */
const RatingFieldContent = {
    name: 'RatingFieldContent',
    components: { Stars },
    mixins: [BaseFieldContentEdit],
    data() {
        return {
            edit: false,
        };
    },
    render(createElement) {
        return createElement(COMPONENTS[this.field.style], {
            props: {
                value: this.value,
                field: this.field,
                edit: this.edit,
            },
            on: { change: (event) => this.$emit('set-value', event) },
        });
    },
};

/**
 * @vue/component
 */
const RatingFieldMixin = {
    components: {
        field_content_readonly: RatingFieldContent,
        field_content_edit: { mixins: [RatingFieldContent], data: () => ({ edit: true }) },
        field_list_view: RatingFieldContent,
    },
    mixins: [BaseFieldMixin],
    methods: {
        setValue(value) {
            if (this.field.nullable && value === this.value) {
                value = null;
            }
            this._emitSetValueSignal(value);
        },
    },
};

export class RatingField extends FloatField {
    constructor(options) {
        super(options);

        this.min = options.minimum ?? 0;
        this.max = options.maximum ?? 5;
        this.step = this.props.step;
        this.style = this.props.style;
        this.color = this.props.color || '#ffb100';
        this.faClass = this.props.fa_class;
    }

    static get mixins() {
        return [RatingFieldMixin];
    }

    getEmptyValue() {
        if (this.nullable) {
            return null;
        }
        return this.min;
    }
}
