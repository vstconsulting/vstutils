import { StringArrayFieldEdit, StringArrayFieldMixin } from './string.js';

function createNumberTag(params) {
    const term = Number(params?.term?.trim() || '');
    if (isNaN(term)) {
        return null;
    }
    return { id: term, text: term, newTag: true };
}

/** @vue/component */
export const NumberArrayFieldEdit = {
    name: 'NumberArrayFieldEdit',
    mixins: [StringArrayFieldEdit],
    computed: {
        selectClasses() {
            return 'select2-hide-dropdown';
        },
    },
    methods: {
        getSelect2Params() {
            return {
                theme: window.SELECT2_THEME,
                tags: true,
                multiple: true,
                templateResult: () => null,
                dropdownCssClass: 'select2-hide-dropdown',
                createTag: createNumberTag,
            };
        },
    },
};

/** @vue/component */
export const NumberArrayFieldMixin = {
    components: {
        field_content_edit: NumberArrayFieldEdit,
    },
    mixins: [StringArrayFieldMixin],
};
