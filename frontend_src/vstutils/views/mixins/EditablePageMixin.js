/**
 * Mixin for a views, that allows to edit data from API.
 *
 * @vue/component
 */
const EditablePageMixin = {
    provide() {
        return {
            updateFieldValue: this.updateFieldValue,
        };
    },
    computed: {
        instance() {
            return this.datastore.data.instance;
        },
    },
    methods: {
        /**
         * Updates field value in store
         * @param {Object} obj
         * @param {string} obj.field
         * @param {any} obj.value
         */
        updateFieldValue(obj) {
            this.commitMutation('setFieldValue', obj);
        },


    },
};

export default EditablePageMixin;
