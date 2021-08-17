<template>
    <tr
        class="item-row item-row-id highlight-tr"
        :class="is_selected"
        :data-id="instance.getPkValue()"
        :data-href="rowLink"
        @click="goToTrLink($event, true)"
    >
        <td
            class="highlight-tr-none guiListSelections-toggle-btn td_select_btn"
            @click="selectCurrentInstance"
        >
            <div class="ico-on fa fa-toggle-on" />
            <div class="ico-off fa fa-toggle-off" />
        </td>
        <td v-for="(field, idx) in fieldsToShow" :key="idx">
            <component
                :is="'field_' + field.options.format"
                :prop_data="data_to_represent"
                :field="field"
                :wrapper_opt="{ list_view: true, use_prop_data: true }"
            />
        </td>
    </tr>
</template>

<script>
    import TableRowMixin from '../../TableRowMixin.js';

    /**
     * Mixin for table row of table, that is used in fk_multi_autocomplete modal.
     */
    export default {
        mixins: [TableRowMixin],
        props: {
            qs: { type: Object, required: true },
            instance: { type: Object, required: true },
            fields: { type: Object, required: true },
            fieldProps: { type: Object, required: true },
            fieldValue: { type: Object, required: true },
        },
        computed: {
            data_to_represent: function () {
                return this.instance.data;
            },
            selected() {
                if (!this.fieldValue.value) {
                    return false;
                }

                let data = this.data_to_represent;

                return data[this.fieldProps.value_field] === this.fieldValue.value;
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
                let view_val = this.data_to_represent[this.fieldProps.view_field];
                let value_val = this.data_to_represent[this.fieldProps.value_field];

                this.$emit('change-value', { view_val: view_val, value_val: value_val });
            },
        },
    };
</script>
