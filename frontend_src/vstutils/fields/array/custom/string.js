import TagsSelector from '../../../components/TagsSelector.vue';
import { BaseFieldContentEdit } from '../../base';
import { ArrayFieldMixin } from '../mixins.js';
import { resumeEnterPropagation, stopEnterPropagation } from '../../../utils';

/** @vue/component */
export const StringArrayFieldEdit = {
    name: 'StringArrayFieldEdit',
    mixins: [BaseFieldContentEdit],
    data() {
        return {
            itemsValidator: undefined,
        };
    },
    render(h) {
        return h(TagsSelector, {
            props: {
                value: this.value || [],
                unique: this.field.uniqueItems,
                validator: this.itemsValidator,
            },
            on: { change: (items) => this.$emit('set-value', items) },
        });
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
