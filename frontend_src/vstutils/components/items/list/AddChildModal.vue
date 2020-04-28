<template>
    <!--<div style="display: contents;">-->
    <div style="display: inline-block;">
        <preloader :show="show_loader"></preloader>

        <gui_modal v-show="show_modal" @close="close">
            <template v-slot:header>
                <h3>{{ ($t('add') + ' ' + $t('child instances')) | capitalize }}</h3>
            </template>
            <template v-slot:body>
                <current_search_input
                    :field_props="field_props"
                    @filterQuerySetItems="filterQuerySetItems"
                ></current_search_input>
                <current_pagination :options="data.pagination" @goToPage="goToPage"></current_pagination>
                <template v-if="is_empty">
                    <p class="text-center">{{ $t('list is empty') | capitalize }}</p>
                </template>
                <template v-else>
                    <current_table
                        :instances="instances"
                        :opt="opt"
                        @changeValue="changeValue"
                        @setSelections="setSelections"
                        @toggleSelection="toggleSelection"
                    ></current_table>
                </template>
            </template>
            <template v-slot:footer>
                <button
                    class="btn btn-default btn-operation-add-child-close"
                    @click="close"
                    aria-label="Cancel"
                >
                    {{ $t('cancel') | capitalize }}
                </button>
                <button
                    class="btn btn-primary btn-operation-add-child-apply"
                    @click="addSelected"
                    aria-label="Add selected"
                >
                    {{ $t('add') | capitalize }}
                </button>
            </template>
        </gui_modal>
        <button class="btn btn-primary btn-operation-add" @click="open" aria-label="Add">
            <span class="fa fa-folder-open"></span>
            <span class="d-none d-lg-inline-block title-for-btn">{{ $t('add') | capitalize }}</span>
        </button>
    </div>
</template>

<script>
    import { BaseInstancesTableMixin, BaseInstancesTableRowMixin } from '../../mixins';
    import { BaseModalWindowForInstanceList } from '../../../fields';

    /**
     * Component for modal window with list of child instances,
     * that can be added to the parents list.
     */
    export default {
        name: 'gui_add_child_modal',
        mixins: [BaseModalWindowForInstanceList],
        props: ['options'],
        data() {
            return {
                /**
                 * Property, that stores view of child list.
                 */
                child_view: undefined,
                /**
                 * Property, that stores selection pairs -
                 * (instance_id, selection_value).
                 */
                selections: {},
            };
        },
        created() {
            this.child_view = app.views[this.options.list_paths[0]];
            this.qs = app.views[this.options.list_paths[0]].objects.clone();
        },
        computed: {
            /**
             * Property, that returns fields of list fields.
             */
            fields() {
                return this.qs.model.fields;
            },
            /**
             * Property, that returns child_view schema.
             */
            schema() {
                return this.child_view.schema;
            },
            /**
             * Property, that returns object with different properties for modal table.
             */
            opt() {
                return {
                    url: this.qs.url,
                    view: this.child_view,
                    schema: this.schema,
                    fields: this.fields,
                    enable_multiple_select: true,
                    selections: this.selections,
                };
            },
            /**
             * Property, that returns filter for search input.
             */
            field_props() {
                return {
                    view_field: this.qs.model.view_name,
                };
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
             * Method, that sets new value for selections object.
             */
            changeValue(opt) {
                this.selections = { ...opt.selections };
            },
            /**
             * Method, that inits adding of selected child instances to parent list.
             */
            addSelected() {
                for (let [id, val] of Object.entries(this.selections)) {
                    if (!val) {
                        continue;
                    }
                    this.addChildToParent(id);
                }

                this.close();
            },
            /**
             * Method, that calls 'addChildInstance' method of parent view.
             */
            addChildToParent(id) {
                this.$root.$emit('eventHandler-' + this.$root.$children.last._uid, 'addChildInstance', {
                    data: { id: id },
                });
            },
            /**
             * Redefinitions of base 'onClose' method.
             */
            onClose() {
                this.selections = { ...{} };
            },
            /**
             * Method, that sets new value to selections object.
             * @param {object} opt New selections value.
             */
            setSelections(opt) {
                this.selections = { ...opt };
            },
            /**
             * Method, that changes instance selection value to opposite.
             * @param {object} opt Object with instance id value.
             */
            toggleSelection(opt) {
                if (this.selections[opt.id] === undefined) {
                    this.selections[opt.id] = true;
                } else {
                    this.selections[opt.id] = !this.selections[opt.id];
                }

                this.selections = { ...this.selections };
            },
            /**
             * Method - callback for 'updateInstances' method.
             * @param {object} qs New QuerySet object.
             */
            onUpdateInstances(qs) {
                this.qs = qs;
            },
        },
        components: {
            /**
             * Modal window table.
             */
            current_table: {
                mixins: [BaseInstancesTableMixin],
                watch: {
                    selections(selections) {
                        this.$emit('changeValue', { selections: selections });
                    },
                },
                components: {
                    current_table_row: {
                        mixins: [BaseInstancesTableRowMixin],
                    },
                },
            },
        },
    };
</script>

<style scoped></style>
