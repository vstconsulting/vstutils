<template>
    <div style="display: inline-block;">
        <preloader :show="show_loader" />

        <gui_modal v-show="show_modal" @close="close">
            <template #header>
                <h3>{{ ($t('add') + ' ' + $t('child instances')) | capitalize }}</h3>
            </template>
            <template #body>
                <current_search_input :field_props="field_props" @filterQuerySetItems="filterQuerySetItems" />
                <current_pagination :options="data.pagination" @goToPage="goToPage" />
                <template v-if="is_empty">
                    <p class="text-center">
                        {{ $t('list is empty') | capitalize }}
                    </p>
                </template>
                <template v-else>
                    <current_table
                        :instances="instances"
                        :opt="opt"
                        @change-value="changeValue"
                        @setSelections="setSelections"
                        @toggleSelection="toggleSelection"
                    />
                </template>
            </template>
            <template #footer>
                <button
                    class="btn btn-default btn-operation-add-child-close"
                    aria-label="Cancel"
                    @click="close"
                >
                    {{ $t('cancel') | capitalize }}
                </button>
                <button
                    class="btn btn-primary btn-operation-add-child-apply"
                    aria-label="Add selected"
                    @click="addSelected"
                >
                    {{ $t('add') | capitalize }}
                </button>
            </template>
        </gui_modal>
        <button class="btn btn-primary btn-operation-add" aria-label="Add" @click="open">
            <span class="fa fa-folder-open" />
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
        components: {
            /**
             * Modal window table.
             */
            current_table: {
                mixins: [BaseInstancesTableMixin],
                watch: {
                    selections(selections) {
                        this.$emit('change-value', { selections: selections });
                    },
                },
                components: {
                    current_table_row: BaseInstancesTableRowMixin,
                },
            },
        },
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
        created() {
            this.child_view = app.views[this.options.list_paths[0]];
            this.qs = this.child_view.objects.clone();
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
                this.$root.$refs.currentViewComponent.addChildInstance({ data: { id: id } });
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
    };
</script>

<style scoped></style>
