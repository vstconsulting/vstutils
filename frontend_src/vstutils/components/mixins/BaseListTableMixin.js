import { addCssClassesToElement } from '../../utils';
import { HideFieldInTableMixin } from '../../fields';

/**
 * Mixin for gui_list_table and gui_list_table_row.
 */
const BaseListTableMixin = {
    name: 'base_list_table_mixin',
    mixins: [HideFieldInTableMixin],
    computed: {
        child_actions_exist: function () {
            return this.doesPropertyExist(this.schema, 'child_links');
        },
        multi_actions_exist: function () {
            return this.doesPropertyExist(this.schema, 'multi_actions');
        },
    },
    methods: {
        doesPropertyExist(obj, property) {
            if (!obj[property]) {
                return false;
            }

            if (Array.isArray(obj[property])) {
                return obj[property].length > 0;
            }

            if (typeof obj[property] == 'object') {
                return Object.keys(obj[property]).length > 0;
            }
        },
        td_classes(el, name) {
            return addCssClassesToElement(el, name, this.schema.operation_id.replace('_list', ''));
        },
    },
};

export default BaseListTableMixin;
