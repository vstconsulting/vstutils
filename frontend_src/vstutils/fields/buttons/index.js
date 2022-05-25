import FieldButtonTemplate from './FieldButtonTemplate.vue';

/**
 * @vue/component
 */
export const BaseFieldButton = {
    mixins: [FieldButtonTemplate],
    data() {
        return {
            iconClasses: [],
            helpText: '',
            wrapperClasses: ['input-group-append'],
            wrapperStyles: {},
            spanClasses: ['input-group-text'],
            spanStyles: {},
            iconStyles: {},
        };
    },
};

/**
 * @vue/component
 */
export const FieldButton = {
    mixins: [FieldButtonTemplate],
    props: {
        iconClasses: { type: Array, required: true },
        helpText: { type: String, required: true },
        wrapperClasses: { type: Array, required: false, default: () => ['input-group-append'] },
        wrapperStyles: { type: Object, required: false, default: () => ({}) },
        spanClasses: { type: Array, required: false, default: () => ['input-group-text'] },
        spanStyles: { type: Object, required: false, default: () => ({}) },
        iconStyles: { type: Object, required: false, default: () => ({}) },
    },
};

/**
 * @vue/component
 */
export const ClearButton = {
    name: 'ClearButton',
    mixins: [BaseFieldButton],
    data() {
        return { helpText: 'Clean value', iconClasses: ['fa', 'fa-times'] };
    },
};

/**
 * @vue/component
 */
export const HideButton = {
    name: 'HideButton',
    mixins: [BaseFieldButton],
    data() {
        return { helpText: 'Hide field', iconClasses: ['fa', 'fa-minus'] };
    },
};

/**
 * @vue/component
 */
export const SetDefaultButton = {
    name: 'SetDefaultButton',
    mixins: [BaseFieldButton],
    data() {
        return { helpText: 'Set default value', iconClasses: ['fas', 'fa-redo'] };
    },
};
