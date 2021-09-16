/* eslint-disable vue/one-component-per-file */
import { BaseFieldContentReadonlyMixin, BaseFieldListView, BaseFieldMixin } from '../base';
import ArrayFieldEdit from './ArrayFieldEdit.vue';

const NOT_INLINE_FIELDS = ['array', 'nested-object', 'textarea'];

/** @vue/component */
const ReadonlyMixin = {
    methods: {
        renderItem(item, attrs = {}) {
            return this.$createElement(this.field.itemField.component, {
                props: {
                    field: this.field.itemField,
                    data: { [this.field.name]: item },
                    type: this.$parent.type,
                    hideTitle: true,
                },
                ...attrs,
            });
        },
        renderInline(items) {
            const nodes = [];
            for (let i = 0; i < items.length; i++) {
                nodes.push(this.renderItem(items[i], { style: 'display: inline-block;' }));
                if (i + 1 < items.length) {
                    nodes.push(', ');
                }
            }
            return this.$createElement('div', {}, nodes);
        },
        renderBlocks(items) {
            return this.$createElement(
                'div',
                { staticClass: 'row' },
                items.map((item) =>
                    this.$createElement('div', { staticClass: 'col-12' }, [this.renderItem(item)]),
                ),
            );
        },
    },
    render() {
        if (NOT_INLINE_FIELDS.includes(this.field.itemField.format)) {
            return this.renderBlocks(this.value);
        }
        return this.renderInline(this.value);
    },
};

/** @vue/component */
export const ArrayFieldReadonly = {
    mixins: [BaseFieldContentReadonlyMixin, ReadonlyMixin],
};

/** @vue/component */
export const ArrayFieldList = {
    mixins: [BaseFieldListView, ReadonlyMixin],
};

/** @vue/component */
export const ArrayFieldMixin = {
    components: {
        field_content_readonly: ArrayFieldReadonly,
        field_content_edit: ArrayFieldEdit,
        field_list_view: ArrayFieldList,
    },
    mixins: [BaseFieldMixin],
};
