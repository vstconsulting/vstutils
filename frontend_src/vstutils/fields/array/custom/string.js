import $ from 'jquery';
import { BaseFieldContentEdit } from '../../base';
import { ArrayFieldMixin } from '../mixins.js';
import { resumeEnterPropagation, stopEnterPropagation } from '../../../utils';

/** @vue/component */
export const StringArrayFieldEdit = {
    name: 'StringArrayFieldEdit',
    mixins: [BaseFieldContentEdit],
    computed: {
        selectClasses() {
            return 'select2-hide-dropdown';
        },
    },
    mounted() {
        this.initSelect2();
        this.$watch('value', this.setSelect2Value, { immediate: true });
    },
    beforeDestroy() {
        this.destroySelect2();
    },
    methods: {
        getSelect2Params() {
            return {
                theme: window.SELECT2_THEME,
                tags: true,
                multiple: true,
                templateResult: () => null,
                dropdownCssClass: 'select2-hide-dropdown',
            };
        },
        initSelect2() {
            const el = $(this.$el);
            el.select2(this.getSelect2Params()).on('change', () => {
                const data = el.select2('data');
                if (data && Array.isArray(data)) {
                    const items = data.map((selection) => selection.text);
                    if (!this.isSameValue(items, this.value)) {
                        this.$emit('set-value', items);
                    }
                }
            });
        },

        destroySelect2() {
            $(this.$el).off().select2('destroy');
        },
        isSameValue(first, second) {
            if (first === second) {
                return true;
            }
            if (typeof first !== typeof second) {
                return false;
            }
            if (Array.isArray(first) && Array.isArray(second)) {
                return first.join(',') === second.join(',');
            }
            return false;
        },
        setSelect2Value(value) {
            this.$el.innerHTML = '';
            if (Array.isArray(value)) {
                const fragment = new DocumentFragment();
                for (const item of value) {
                    fragment.appendChild(new Option(item, item, false, true));
                }
                this.$el.appendChild(fragment);
                $(this.$el).trigger('change');
            }
        },
    },
    render(h) {
        return h('select', { style: 'width: 100%', class: this.selectClasses });
    },
};

/** @vue/component */
export const StringArrayFieldMixin = {
    components: {
        field_content_edit: StringArrayFieldEdit,
    },
    mixins: [ArrayFieldMixin],
    mounted() {
        stopEnterPropagation(this.$el);
    },
    beforeDestroy() {
        resumeEnterPropagation(this.$el);
    },
};
