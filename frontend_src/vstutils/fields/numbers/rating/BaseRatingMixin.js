/**
 * @vue/component
 */
export default {
    props: {
        value: { type: Number, default: null },
        field: { type: Object, required: true },
        edit: { type: Boolean, default: false },
    },
};
