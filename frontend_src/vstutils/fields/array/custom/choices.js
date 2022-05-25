import $ from 'jquery';
import { StringArrayFieldEdit, StringArrayFieldMixin } from './string.js';

/** @vue/component */
export const ChoicesArrayFieldEdit = {
    name: 'ChoicesArrayFieldEdit',
    mixins: [StringArrayFieldEdit],
    computed: {
        selectClasses() {
            return '';
        },
    },
    methods: {
        getSelect2Params() {
            return {
                theme: window.SELECT2_THEME,
                multiple: true,
                data: this.field.itemField.prepareEnumData(),
            };
        },
        setSelect2Value(value) {
            if (Array.isArray(value)) {
                $(this.$el).val(value).trigger('change');
            }
        },
    },
};

/** @vue/component */
export const ChoicesArrayFieldMixin = {
    components: {
        field_content_edit: ChoicesArrayFieldEdit,
    },
    mixins: [StringArrayFieldMixin],
};
