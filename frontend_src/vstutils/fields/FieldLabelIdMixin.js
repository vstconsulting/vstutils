/**
 * Mixin, that contains 'label_id' computed property - value of 'id' attribute of field's label.
 */
const FieldLabelIdMixin = {
    name: 'FieldLabelIdMixin',
    props: ['field', 'wrapper_opt', 'value', 'data'],
    computed: {
        label_id() {
            return 'label-for-' + this.field.options.name + '-field';
        },
    },
};

export default FieldLabelIdMixin;
