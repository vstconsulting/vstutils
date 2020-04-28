import BaseModalWindowForInstanceList from '../../BaseModalWindowForInstanceList.vue';

/**
 * Vue component for fk_multi_autocomplete modal window with instances,
 * that could be chosen.
 */
const FKMultiAutocompleteFieldModal = {
    mixins: [BaseModalWindowForInstanceList],
    computed: {
        /**
         * Property, that returns qs for modal window.
         */
        qs() {
            return this.options.qs;
        },
        /**
         * Property, that returns field_props.
         */
        field_props() {
            return this.options.field_props;
        },
        /**
         * Property, that returns field_value.
         */
        field_value() {
            return this.options.field_value;
        },
    },
    methods: {
        /**
         * Method, that opens modal window.
         */
        open() {
            let filters = this.generateFilters();

            this.updateInstances(filters);
        },
        /**
         * Method, that closes modal window.
         */
        close() {
            this.$emit('cleanTmpValue');
            this.show_modal = false;
        },
        /**
         * Method, that emits changeValue event of parent component.
         */
        changeValue(opt) {
            this.$emit('changeValue', opt);
        },
        /**
         * Method, that emits setNewValue event of parent component.
         */
        setNewValue() {
            this.$emit('setNewValue');
            this.close();
        },
        /**
         * Method - callback for 'updateInstances' method.
         * @param {object} qs New QuerySet object.
         */
        onUpdateInstances(qs) {
            this.$emit('updateQuerySet', qs);
        },
    },
};

export default FKMultiAutocompleteFieldModal;
