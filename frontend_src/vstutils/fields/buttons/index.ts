import { defineComponent } from 'vue';
import FieldButtonTemplate from './FieldButtonTemplate.vue';

export const BaseFieldButton = defineComponent({
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
});

export const FieldButton = defineComponent({
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
});

export const ClearButton = defineComponent({
    name: 'ClearButton',
    mixins: [BaseFieldButton],
    data() {
        return { helpText: 'Clean value', iconClasses: ['fa', 'fa-times'] };
    },
});

export const HideButton = defineComponent({
    name: 'HideButton',
    mixins: [BaseFieldButton],
    data() {
        return { helpText: 'Hide field', iconClasses: ['fa', 'fa-minus'] };
    },
});

export const SetDefaultButton = defineComponent({
    name: 'SetDefaultButton',
    mixins: [BaseFieldButton],
    data() {
        return { helpText: 'Set default value', iconClasses: ['fas', 'fa-redo'] };
    },
});
