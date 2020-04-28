<template>
    <tr
        class="item-row item-row-id highlight-tr"
        :class="tr_classes"
        @click="goToTrLink($event, _blank)"
        @mousedown="onMouseDownHandler"
        :data-id="instance.getPkValue()"
        :data-href="base_url + '/' + instance.getPkValue()"
    >
        <td
            class="highlight-tr-none guiListSelections-toggle-btn td_select_btn"
            @click="toggleSelection"
            v-if="with_select"
        >
            <div class="ico-on fa fa-toggle-on"></div>
            <div class="ico-off fa fa-toggle-off"></div>
        </td>
        <td v-for="(field, idx) in fieldsToShow" :key="idx" :class="td_classes('td', field.options.name)">
            <component
                :is="'field_' + field.options.format"
                :prop_data="data_to_represent"
                :field="field"
                :wrapper_opt="{ list_view: true, use_prop_data: true }"
            ></component>
        </td>
        <td :class="td_classes('column', 'actions')" v-if="with_actions">
            <div class="btn-group" role="group">
                <gui_buttons_list
                    type="child_link"
                    :instance_id="instance.getPkValue()"
                    :buttons="child_links_buttons"
                    text="actions"
                    :look="{ classes: ['btn-primary'] }"
                ></gui_buttons_list>
            </div>
        </td>
    </tr>
</template>

<script>
    import { TableRowMixin } from '../../fields';
    import BaseListTableMixin from './BaseListTableMixin.js';
    import BaseInstancesTableAndRowMixin from './BaseInstancesTableAndRowMixin.js';

    /**
     * Mixin for modal window table row.
     */
    export default {
        name: 'base_instances_table_row_mixin',
        mixins: [BaseListTableMixin, TableRowMixin, BaseInstancesTableAndRowMixin],
        props: {
            instance: {
                type: Object,
            },
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
            /**
             * Filter columns with field that should be hidden.
             */
            fieldsToShow() {
                return Object.values(this.fields).filter((field) => !this.hideField(field));
            },
            with_select() {
                let p = 'enable_select';

                return this.opt[p] !== undefined ? this.opt[p] : this[p];
            },

            selected: function () {
                return this.opt.selected;
            },

            tr_classes: function () {
                let classes = this.selected ? 'selected' : '';

                for (let key in this.fields) {
                    if (this.fields.hasOwnProperty(key)) {
                        let field = this.fields[key];

                        if (field.options.format == 'choices' || field.options.type == 'choices') {
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
                return this.list_url.replace(/\/$/g, '');
            },
            data_to_represent: function () {
                return this.instance.data;
            },
            _blank() {
                let p = 'blank_url';
                return this.opt[p] !== undefined ? this.opt[p] : this[p];
            },

            child_links_buttons() {
                return this.opt.view.getViewSublinkButtons(
                    'child_links',
                    this.schema.child_links,
                    this.instance,
                );
            },
        },
        methods: {
            toggleSelection() {
                this.$emit('toggleSelection', { id: this.instance.getPkValue() });
            },
        },
    };
</script>

<style scoped></style>
