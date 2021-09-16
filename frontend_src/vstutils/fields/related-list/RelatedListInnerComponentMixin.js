/** @vue/component */
export const RelatedListInnerComponentMixin = {
    props: {
        value: { type: Array, default: () => [] },
        model: { type: Function, required: true },
    },
    computed: {
        fields() {
            return Array.from(this.model.fields.values()).filter((field) => !field.hidden);
        },
    },
};
