const FKMultiAutocompleteFieldModal = {
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
            this.$emit('clean-tmp-value');
            this.showModal = false;
        },
        /**
         * Method, that emits changeValue event of parent component.
         */
        changeValue(opt) {
            this.$emit('change-value', opt);
        },
        /**
         * Method, that emits setNewValue event of parent component.
         */
        setNewValue() {
            this.$emit('set-new-value');
            this.close();
        },
        /**
         * Method - callback for 'updateInstances' method.
         * @param {object} qs New QuerySet object.
         */
        onUpdateInstances(qs) {
            this.$emit('update-query-set', qs);
        },
    },
};

export default FKMultiAutocompleteFieldModal;
