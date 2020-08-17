import ListTableRow from '../items/list/ListTableRow.vue';
import { addCssClassesToElement } from '../../utils';

/**
 * Mixin for modal window table row.
 */
export default {
    name: 'base_instances_table_row_mixin',
    mixins: [ListTableRow],
    props: {
        opt: {
            default: () => {
                return {};
            },
        },
    },
    data() {
        return {
            blank_url: true,
            enable_select: true,
            enable_actions: false,
        };
    },
    computed: {
        multi_actions_exist() {
            let p = 'enable_select';

            return this.opt[p] !== undefined ? this.opt[p] : this[p];
        },
        selected() {
            return this.opt.selected;
        },
        classes() {
            let classes = this.selected ? 'selected' : '';

            for (let key in this.fields) {
                if (Object.prototype.hasOwnProperty.call(this.fields, key)) {
                    let field = this.fields[key];

                    if (field.options.format === 'choices' || field.options.type === 'choices') {
                        classes +=
                            ' ' +
                            addCssClassesToElement(
                                'tr',
                                this.instance.data[field.options.name],
                                field.options.name,
                            );
                    }
                }
            }

            return classes;
        },
        base_url() {
            return this.opt.url.replace(/\/$/g, '');
        },
        rowLink() {
            return this.base_url + '/' + this.instance.getPkValue();
        },
        openInNewWindow() {
            const p = 'blank_url';
            return this.opt[p] !== undefined ? this.opt[p] : this[p];
        },
        child_actions_exist() {
            return this.opt.with_actions;
        },
        actionButtonsText() {
            return 'actions';
        },
    },
    methods: {
        toggleSelection() {
            this.$emit('toggleSelection', { id: this.instance.getPkValue() });
        },
    },
};
