/**
 * Mixin for modal window table, table row mixin.
 */
const BaseInstancesTableAndRowMixin = {
    name: 'base_instances_table_and_table_row_mixin',
    computed: {
        /**
         * Boolean property, that means is there actions row in the table.
         */
        with_actions() {
            let p = 'enable_actions';

            return this.opt[p] !== undefined ? this.opt[p] : this[p];
        },
        /**
         * Property, that returns url for instances list.
         */
        list_url() {
            return this.opt.url ? this.opt.url : this.$route.path;
        },
        /**
         * Property, that returns schema of current instances list view.
         */
        schema() {
            return this.opt.schema || {};
        },
        /**
         * Property, that returns fields of current instances list.
         */
        fields() {
            return this.opt.fields;
        },
    },
};

export default BaseInstancesTableAndRowMixin;
