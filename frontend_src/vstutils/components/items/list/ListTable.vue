<template>
    <table class="table table-bordered table-bordered-custom multiple-select">
        <thead>
            <tr :class="classes">
                <th
                    style="width: 50px;"
                    @click="changeAllRowsSelection"
                    class="global-select td_select_btn"
                    v-if="multi_actions_exist"
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

                <th
                    style="width: 60px;"
                    :class="td_classes('column', 'actions')"
                    v-if="child_actions_exist"
                ></th>
            </tr>
        </thead>
        <tbody>
            <gui_list_table_row
                v-for="(instance, idx) in instances"
                :key="idx"
                :instance="instance"
                :fields="fields"
                :view="view"
                :opt="opt"
            ></gui_list_table_row>
        </tbody>
    </table>
</template>

<script>
    import { BaseListTableMixin } from '../../mixins';

    /**
     * Component for 'list' views data representation.
     * This component represents view data as table.
     */
    export default {
        name: 'gui_list_table',
        mixins: [BaseListTableMixin],
        props: ['instances', 'fields', 'view', 'opt'],
        computed: {
            fieldsToShow() {
                return Object.values(this.fields).filter((field) => !this.hideField(field));
            },
            store_url() {
                return this.opt.store_url;
            },
            allSelected() {
                let selections = this.$store.getters.getSelections(this.store_url);
                for (let index = 0; index < this.instances.length; index++) {
                    let instance = this.instances[index];
                    if (!selections[instance.getPkValue()]) {
                        return false;
                    }
                }
                return true;
            },
            classes: function () {
                return this.allSelected ? 'selected' : '';
            },
            schema() {
                return this.view.schema;
            },
        },
        methods: {
            changeAllRowsSelection() {
                let ids = {};
                for (let index = 0; index < this.instances.length; index++) {
                    let instance = this.instances[index];
                    ids[instance.getPkValue()] = !this.allSelected;
                }
                this.$store.commit('setSelectionValuesByIds', {
                    url: this.store_url,
                    ids: ids,
                });
            },
        },
    };
</script>

<style scoped></style>
