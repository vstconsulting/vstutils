import type { PropType } from 'vue';
import { defineComponent, h } from 'vue';

import TagsSelector from '@/vstutils/components/TagsSelector.vue';
import { HideButton } from '@/vstutils/fields/buttons';
import { resumeEnterPropagation, stopEnterPropagation } from '@/vstutils/utils';

import { ArrayFieldMixin } from '../mixins';

import type ArrayField from '../ArrayField';

import './style.scss';

export const StringArrayFieldEdit = defineComponent({
    name: 'StringArrayFieldEdit',
    props: {
        field: { type: Object as PropType<ArrayField>, required: true },
        value: { type: Array, default: undefined },
        data: { type: Object as PropType<Record<string, unknown>>, default: undefined },
        hideable: { type: Boolean, required: false, default: false },
    },
    data() {
        return {
            itemsValidator: undefined,
        };
    },
    render() {
        const children = [
            h(TagsSelector, {
                props: {
                    value: this.value || [],
                    unique: this.field.uniqueItems,
                    validator: this.itemsValidator,
                },
                on: { change: (items: unknown[]) => this.$emit('set-value', items) },
                class: 'tags-selector',
            }),
        ];
        if (this.hideable) {
            children.push(
                h(HideButton, {
                    nativeOn: { click: (field: ArrayField) => this.$emit('hide-field', field) },
                }),
            );
        }
        return h('div', { class: 'input-group' }, children);
    },
});

export const StringArrayFieldMixin = defineComponent({
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
});
