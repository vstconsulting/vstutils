<template>
    <table class="table table-bordered" :class="table_classes">
        <thead>
            <tr :class="header_tr_classes">
                <th
                    style="width: 50px;"
                    @click="changeAllRowsSelection"
                    class="global-select td_select_btn"
                    v-if="with_multiple_select"
                >
                    <div class="ico-on fa fa-toggle-on"></div>
                    <div class="ico-off fa fa-toggle-off"></div>
                </th>

                <th
                    v-for="(field, idx) in fieldsToShow"
                    :key="idx"
                    :class="td_classes('td', field.options.name)"
                >
                    {{ $t((field.options.title || field.options.name).toLowerCase()) | capitalize | split }}
                </th>

                <th style="width: 120px;" :class="td_classes('column', 'actions')" v-if="with_actions">
                    {{ $t('actions') }}
                </th>
            </tr>
        </thead>
        <tbody>
            <current_table_row
                v-for="(instance, idx) in instances"
                :key="idx"
                :instance="instance"
                :opt="row_opt(instance)"
                @toggleSelection="toggleSelection"
            ></current_table_row>
        </tbody>
    </table>
</template>

<script>
    import BaseListTableMixin from './BaseListTableMixin.js';
    import BaseInstancesTableAndRowMixin from './BaseInstancesTableAndRowMixin.js';

    /**
     * Mixin for modal window table.
     */
    export default {
        name: 'base_instances_table_mixin',
        mixins: [BaseListTableMixin, BaseInstancesTableAndRowMixin],
        props: {
            instances: {
                type: Array,
            },
            opt: {
                default: () => {},
            },
        },
        data() {
            return {
                enable_multiple_select: false,
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
            /**
             * Boolean property, that means is there multiple select in the table.
             */
            with_multiple_select() {
                let p = 'enable_multiple_select';

                return this.opt[p] !== undefined ? this.opt[p] : this[p];
            },
            /**
             * Property that returns CSS class for current table.
             */
            table_classes() {
                return this.with_multiple_select ? 'multiple-select' : '';
            },
            /**
             * Property that returns CSS class for current table's head row.
             */
            header_tr_classes() {
                return this.allSelected ? 'selected' : '';
            },
            /**
             * Property that returns true, if all instances in the table selected.
             * Otherwise, it returns false.
             */
            allSelected() {
                let selections = this.getSelections();

                for (let index = 0; index < this.instances.length; index++) {
                    let instance = this.instances[index];

                    if (!selections[instance.getPkValue()]) {
                        return false;
                    }
                }

                return true;
            },
        },
        methods: {
            /**
             * Method, that changes selects/unselects all instances in the table.
             */
            changeAllRowsSelection() {
                let ids = {};
                for (let index = 0; index < this.instances.length; index++) {
                    let instance = this.instances[index];
                    ids[instance.getPkValue()] = !this.allSelected;
                }
                this.setSelections(ids);
            },
            /**
             * Method, that returns 'selections' object.
             */
            getSelections() {
                return this.opt.selections;
            },
            /**
             * Method, that calls parents 'setSelections' method.
             * @param {array} ids Array with ids of instances,
             * selection of which should be changed.
             */
            setSelections(ids) {
                this.$emit('setSelections', Object.assign(this.opt.selections, ids));
            },
            /**
             * Method, that calls parents 'toggleSelection' method.
             * @param {object} opt.
             */
            toggleSelection(opt) {
                this.$emit('toggleSelection', opt);
            },
            /**
             * Method, that forms object with properties for table row.
             * @param {object} instance Instance for table row.
             */
            row_opt(instance) {
                return {
                    view: this.opt.view,
                    schema: this.schema,
                    fields: this.fields,
                    url: this.list_url,
                    selected: this.opt.selections[instance.getPkValue()],
                };
            },
        },
    };
</script>

<style scoped></style>
