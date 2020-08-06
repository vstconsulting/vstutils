<template>
    <tr
        class="item-row item-row-id highlight-tr"
        :class="is_selected"
        @click="goToTrLink($event, true)"
        :data-id="rowLink"
        :data-href="base_url + '/' + instance.getPkValue()"
    >
        <td
            class="highlight-tr-none guiListSelections-toggle-btn td_select_btn"
            @click="selectCurrentInstance"
        >
            <div class="ico-on fa fa-toggle-on"></div>
            <div class="ico-off fa fa-toggle-off"></div>
        </td>
        <td v-for="(field, idx) in fieldsToShow" :key="idx">
            <component
                :is="'field_' + field.options.format"
                :prop_data="data_to_represent"
                :field="field"
                :wrapper_opt="{ list_view: true, use_prop_data: true }"
            ></component>
        </td>
    </tr>
</template>

<script>
    import HideFieldInTableMixin from '../../HideFieldInTableMixin.js';
    import TableRowMixin from '../../TableRowMixin.js';

    /**
     * Mixin for table row of table, that is used in fk_multi_autocomplete modal.
     */
    export default {
        mixins: [HideFieldInTableMixin, TableRowMixin],
        props: ['qs', 'instance', 'fields', 'field_props', 'field_value'],
        computed: {
            data_to_represent: function () {
                // return this.instance.toRepresent();
                return this.instance.data;
            },
            selected() {
                if (!this.field_value.value) {
                    return false;
                }

                let data = this.data_to_represent;

                if (data[this.field_props.value_field] == this.field_value.value) {
                    return true;
                }

                return false;
            },
            rowLink() {
                return this.base_url + '/' + this.instance.getPkValue();
            },
            is_selected() {
                if (this.selected) {
                    return 'selected';
                }
                return '';
            },
            base_url() {
                return this.qs.url.replace(/\/$/g, '');
            },
        },
        methods: {
            /**
             * Method, that emits parent's 'changeValue' event,
             * that should change value of field.
             */
            selectCurrentInstance() {
                let view_val = this.data_to_represent[this.field_props.view_field];
                let value_val = this.data_to_represent[this.field_props.value_field];

                this.$emit('change-value', { view_val: view_val, value_val: value_val });
            },
        },
    };
</script>

<style scoped></style>
