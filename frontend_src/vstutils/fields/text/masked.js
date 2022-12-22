import StringField from './StringField';
import {
    BaseFieldContentEdit,
    BaseFieldContentReadonlyMixin,
    BaseFieldListView,
    BaseFieldMixin,
} from '../base';

import IMask from 'imask';
import { ValidationError } from '../validation';

const MaskedValueMixin = {
    computed: {
        preparedValue() {
            return IMask.pipe(this.value ?? '', this.field.mask);
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

        this.mask = {};

        if (typeof this.props.mask === 'string') {
            this.mask.mask = this.getMask(this.props.mask);
        } else if (typeof this.props.mask === 'object') {
            if (typeof this.props.mask.mask === 'string') {
                this.mask.mask = this.getMask(this.props.mask.mask);
                if (this.props.mask.definitions) {
                    this.mask.definitions = this.getDefinitions(this.props.mask.definitions);
                }
                if (this.props.mask.blocks) {
                    this.mask.blocks = this.getBlocks(this.props.mask.blocks);
                }
            } else if (Array.isArray(this.props.mask.mask)) {
                this.mask.mask = this.props.mask.mask.map((subMask) => {
                    subMask.mask = this.getMask(subMask.mask);
                    if (subMask.definitions) {
                        subMask.definitions = this.getDefinitions(subMask.definitions);
                    }
                    if (subMask.blocks) {
                        if (subMask.blocks) {
                            subMask.blocks = this.getBlocks(subMask.blocks);
                        }
                    }
                    return subMask;
                });
            } else {
                this.mask.mask = this.props.mask;
            }
        }
    }
    getMask(str) {
        if (typeof str === 'string' && str.startsWith('/') && str.endsWith('/')) {
            return RegExp(str.slice(1, -1));
        }
        return str;
    }
    getDefinitions(definitions) {
        const parsedDefinitions = {};
        for (const [key, value] of Object.entries(definitions)) {
            if (key.length > 1) {
                throw new ValidationError(`Definition key "${key}" is not a single char.`);
            }
            parsedDefinitions[key] = this.getMask(value);
        }
        return parsedDefinitions;
    }
    getBlocks(blocks) {
        const parsedBlocks = {};
        for (const [key, value] of Object.entries(blocks)) {
            parsedBlocks[key] = { mask: this.getMask(value.mask) };
        }
        return parsedBlocks;
    }
    getEmptyValue() {
        return '';
    }
    static get mixins() {
        return [MaskedFieldMixin];
    }
}
