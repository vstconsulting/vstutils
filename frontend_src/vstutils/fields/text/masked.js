import StringField from './StringField';
import {
    BaseFieldContentEdit,
    BaseFieldContentReadonlyMixin,
    BaseFieldListView,
    BaseFieldMixin,
} from '../base';

import IMask from 'imask';

const MaskedValueMixin = {
    computed: {
        preparedValue() {
            return IMask.pipe(this.value, this.field.mask);
        },
    },
};

/** @vue/component */
export const MaskedFieldEdit = {
    mixins: [BaseFieldContentEdit],
    data() {
        return {
            inputValueName: null,
            inputEventName: null,
        };
    },
    watch: {
        preparedValue(newVal, oldVal) {
            if (newVal === oldVal) {
                return;
            }
            this.mask.unmaskedValue = newVal || '';
        },
    },
    mounted() {
        const element = this.$el.querySelector('input');
        this.mask = IMask(element, this.field.mask);
        this.mask.on('accept', () => {
            this.setValue(this.beforeSet(this.mask.unmaskedValue));
        });
        this.mask.unmaskedValue = this.preparedValue || '';
    },
    methods: {
        setValue(value) {
            this.$emit('set-value', value);
        },
        beforeSet(value) {
            if (!value) return '';
            return value;
        },
    },
};

/** @vue/component */
export const MaskedFieldMixin = {
    components: {
        field_content_edit: MaskedFieldEdit,
        field_content_readonly: {
            mixins: [BaseFieldContentReadonlyMixin, MaskedValueMixin],
        },
        field_list_view: {
            mixins: [BaseFieldListView, MaskedValueMixin],
        },
    },
    mixins: [BaseFieldMixin],
};

export class MaskedField extends StringField {
    constructor(options) {
        super(options);

        this.mask = typeof this.props.mask === 'string' ? { mask: this.props.mask } : this.props.mask;
    }
    getInitialValue() {
        return '';
    }
    static get mixins() {
        return [MaskedFieldMixin];
    }
}
