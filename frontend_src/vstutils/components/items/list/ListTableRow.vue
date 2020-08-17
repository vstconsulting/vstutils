<template>
    <tr
        class="item-row item-row-id highlight-tr"
        :class="classes"
        :data-id="instance.getPkValue()"
        :data-href="rowLink"
        @click="goToTrLink($event, openInNewWindow)"
        @mousedown="onMouseDownHandler"
    >
        <td
            v-if="multi_actions_exist"
            class="highlight-tr-none guiListSelections-toggle-btn td_select_btn"
            @click="toggleSelection"
        >
            <div class="ico-on fa fa-toggle-on" />
            <div class="ico-off fa fa-toggle-off" />
        </td>
        <td v-for="(field, idx) in fieldsToShow" :key="idx" :class="td_classes('td', field.options.name)">
            <component
                :is="'field_' + field.options.format"
                :prop_data="data_to_represent"
                :field="field"
                :wrapper_opt="{ list_view: true, use_prop_data: true }"
            />
        </td>
        <td v-if="child_actions_exist" :class="td_classes('column', 'actions')" style="text-align: center;">
            <div class="btn-group" role="group">
                <gui_buttons_list
                    type="child_link"
                    :text="actionButtonsText"
                    :instance_id="instance.getPkValue()"
                    :buttons="child_links_buttons"
                    :look="{ classes: ['btn-primary'] }"
                />
            </div>
        </td>
    </tr>
</template>

<script>
    import BaseListTableMixin from '../../mixins/BaseListTableMixin.js';
    import { TableRowMixin } from '../../../fields';

    /**
     * Child component of 'gui_list_table' component.
     * This component represents view data item as table row.
     */
    export default {
        name: 'gui_list_table_row',
        mixins: [BaseListTableMixin, TableRowMixin],
        props: ['instance', 'fields', 'view', 'opt'],
        computed: {
            fieldsToShow() {
                return Object.values(this.fields).filter((field) => !this.hideField(field));
            },
            store_url() {
                return this.opt.store_url;
            },
            selected() {
                return this.$store.getters.getSelectionById({
                    url: this.store_url,
                    id: this.instance.getPkValue(),
                });
            },
            classes() {
                return this.selected ? 'selected' : '';
            },
            base_url() {
                return this.$route.path.replace(/\/$/g, '');
            },
            data_to_represent() {
                // return this.instance.toRepresent();
                return this.instance.data;
            },
            schema() {
                return this.view.schema;
            },
            child_links_buttons() {
                return this.view.getViewSublinkButtons('child_links', this.schema.child_links, this.instance);
            },
            openInNewWindow() {
                return false;
            },
            actionButtonsText() {
                return '';
            },
        },
        methods: {
            toggleSelection() {
                this.$store.commit('toggleSelectionValue', {
                    url: this.store_url,
                    id: this.instance.getPkValue(),
                });
            },
        },
    };
</script>

<style scoped></style>
