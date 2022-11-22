import { defineComponent, h, PropType } from 'vue';

import TagsSelector from '@/vstutils/components/TagsSelector.vue';
import { resumeEnterPropagation, stopEnterPropagation } from '@/vstutils/utils';

import { ArrayFieldMixin } from '../mixins';

import type ArrayField from '../ArrayField';

export const StringArrayFieldEdit = defineComponent({
    name: 'StringArrayFieldEdit',
    props: {
        field: { type: Object as PropType<ArrayField>, required: true },
        value: { type: Array, default: undefined },
        data: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    },
    data() {
        return {
            itemsValidator: undefined,
        };
    },
    render() {
        return h(TagsSelector, {
            props: {
                value: this.value || [],
                unique: this.field.uniqueItems,
                validator: this.itemsValidator,
            },
            on: { change: (items: unknown[]) => this.$emit('set-value', items) },
        });
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
