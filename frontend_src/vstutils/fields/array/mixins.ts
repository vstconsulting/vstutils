import { set, defineComponent, PropType, h } from 'vue';
import { BaseFieldMixin, Field } from '@/vstutils/fields/base';
import ArrayFieldEdit from './ArrayFieldEdit.vue';
import ArrayField from './ArrayField';
import { VNode } from 'vue';

const NOT_INLINE_FIELDS = ['textarea', 'uri'];

function isInline(field: Field) {
    if (field.type === 'object' || field.type === 'array') {
        return false;
    }
    if (field.format && NOT_INLINE_FIELDS.includes(field.format)) {
        return false;
    }
    return true;
}

function createReadOnlyComponent(type: string) {
    return defineComponent({
        props: {
            field: { type: Object as PropType<ArrayField>, required: true },
            data: { type: Object as PropType<Record<string, unknown>>, required: true },
            value: { type: Array, default: undefined },
        },

        emits: ['set-value'],

        setup(props, { emit }) {
            function setItemValue(options: { value: unknown; [key: string]: unknown }, idx: number) {
                set(props.value, idx, options.value);
                emit('set-value', props.value, options);
            }
            function renderItem(item: unknown, idx: number, attrs = {}): VNode {
                return h(props.field.itemField?.getComponent(), {
                    props: {
                        field: props.field.itemField,
                        data: { [props.field.name]: item },
                        type,
                        hideTitle: true,
                    },
                    on: {
                        'set-value': (options: { value: unknown; [key: string]: unknown }) =>
                            setItemValue(options, idx),
                    },
                    ...attrs,
                });
            }
            function renderInline(items: unknown[]): VNode {
                const nodes = [];
                for (let i = 0; i < items.length; i++) {
                    nodes.push(renderItem(items[i], i, { style: 'display: inline-block;' }));
                    if (i + 1 < items.length) {
                        nodes.push(', ');
                    }
                }
                return h('div', {}, nodes);
            }
            function renderBlocks(items: unknown[]): VNode {
                return h(
                    'div',
                    { staticClass: 'row' },
                    items.map((item, idx) => h('div', { staticClass: 'col-12' }, [renderItem(item, idx)])),
                );
            }

            return isInline(props.field.itemField!)
                ? () => renderInline(props.value)
                : () => renderBlocks(props.value);
        },
    });
}

export const ArrayFieldMixin = defineComponent({
    components: {
        field_content_readonly: createReadOnlyComponent('readonly'),
        field_content_edit: ArrayFieldEdit,
        field_list_view: createReadOnlyComponent('list'),
    },
    mixins: [BaseFieldMixin],
});
