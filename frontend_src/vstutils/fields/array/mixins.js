import { set, defineComponent } from 'vue';
import { BaseFieldContentReadonlyMixin, BaseFieldListView, BaseFieldMixin } from '@/vstutils/fields/base';
import ArrayFieldEdit from './ArrayFieldEdit.vue';

const NOT_INLINE_FIELDS = ['array', 'nested-object', 'textarea', 'uri'];

const ReadonlyMixin = defineComponent({
    methods: {
        setItemValue(options, idx) {
            set(this.value, idx, options.value);
            this.$parent.$emit('set-value', { ...options, value: this.value });
        },
        renderItem(item, idx, attrs = {}) {
            return this.$createElement(this.field.itemField.component, {
                props: {
                    field: this.field.itemField,
                    data: { [this.field.name]: item },
                    type: this.$parent.type,
                    hideTitle: true,
                },
                on: {
                    'set-value': (options) => this.setItemValue(options, idx),
                },
                ...attrs,
            });
        },
        renderInline(items) {
            const nodes = [];
            for (let i = 0; i < items.length; i++) {
                nodes.push(this.renderItem(items[i], i, { style: 'display: inline-block;' }));
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
                items.map((item, idx) =>
                    this.$createElement('div', { staticClass: 'col-12' }, [this.renderItem(item, idx)]),
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
});

export const ArrayFieldReadonly = defineComponent({
    mixins: [BaseFieldContentReadonlyMixin, ReadonlyMixin],
});

export const ArrayFieldList = defineComponent({
    mixins: [BaseFieldListView, ReadonlyMixin],
});

export const ArrayFieldMixin = defineComponent({
    components: {
        field_content_readonly: ArrayFieldReadonly,
        field_content_edit: ArrayFieldEdit,
        field_list_view: ArrayFieldList,
    },
    mixins: [BaseFieldMixin],
});
