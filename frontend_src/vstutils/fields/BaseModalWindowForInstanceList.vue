<template>
    <div style="display: contents;">
        <preloader :show="show_loader" />

        <gui_modal v-show="show_modal" @close="close">
            <template #header>
                <h3>{{ $t(qs.model.name.toLowerCase()) | capitalize }}</h3>
            </template>
            <template #body>
                <current_search_input :field_props="field_props" @filterQuerySetItems="filterQuerySetItems" />
                <current_pagination :options="data.pagination" @goToPage="goToPage" />
                <template v-if="is_empty">
                    <p class="text-center">{{ $t('list is empty') | capitalize }}</p>
                </template>
                <template v-else>
                    <current_table
                        :instances="instances"
                        :qs="qs"
                        :field_props="field_props"
                        :field_value="field_value"
                        @change-value="changeValue"
                    />
                </template>
            </template>
            <template #footer>
                <button class="btn btn-default" aria-label="Cancel" @click="close">
                    {{ $t('cancel') | capitalize }}
                </button>
                <button class="btn btn-primary" aria-label="Add selected" @click="setNewValue">
                    {{ $t('add') | capitalize }}
                </button>
            </template>
        </gui_modal>

        <div
            data-toggle="tooltip"
            title="Open modal window"
            class="input-group-append"
            role="button"
            aria-label="Open modal window"
            @click="open"
        >
            <span class="input-group-text" style="cursor: pointer;">
                <span class="fa fa-chevron-down" />
            </span>
        </div>
    </div>
</template>

<script>
    import { isEmptyObject } from '../utils';
    import ModalWindowAndButtonMixin from './ModalWindowAndButtonMixin.js';
    import MainPagination from './MainPagination.vue';
    import FKMultiAutocompleteFieldTable from './fk/multi-autocomplete/FKMultiAutocompleteFieldTable.vue';
    import FKMultiAutocompleteFieldSearchInput from './fk/multi-autocomplete/FKMultiAutocompleteFieldSearchInput.vue';

    export default {
        components: {
            /**
             * Component for table with instance.
             */
            current_table: FKMultiAutocompleteFieldTable,
            /**
             * Component for search input of fk_multi_autocomplete field.
             */
            current_search_input: FKMultiAutocompleteFieldSearchInput,
            current_pagination: {
                mixins: [MainPagination],
                methods: {
                    /**
                     * Method, that open new pagination page.
                     */
                    goToPage(page_number) {
                        this.$emit('goToPage', page_number);
                    },
                },
            },
        },
        mixins: [ModalWindowAndButtonMixin],
        props: ['options'],
        data() {
            return {
                /**
                 * Property, that is responsible
                 * for preloader showing/hiding.
                 */
                show_loader: false,
                /**
                 * Property with data for modal list.
                 */
                data: {
                    instances: [],
                    pagination: {
                        count: 0,
                        page_size: 10,
                        page_number: 1,
                    },
                },
            };
        },
        computed: {
            /**
             * Property, that returns instances, loaded for modal list.
             */
            instances() {
                return this.data.instances;
            },
            /**
             * Property, that returns true, if there is no instance.
             * Otherwise, it returns false.
             */
            is_empty() {
                return isEmptyObject(this.instances);
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
             * Method, that filters instances
             * according to the filter value.
             * @param {string, number} value Filter value.
             */
            filterQuerySetItems(value) {
                let filters = this.generateFilters(this.field_props.view_field, value);

                this.updateInstances(filters);
            },
            /**
             * Method, that loads data for new pagination page.
             */
            goToPage(page) {
                let filters = this.generateFilters('page', page);

                this.updateInstances(filters);
            },
            /**
             * Method, that updates instances list
             * according to the filters.
             * @param {object} filters Object with filters values.
             */
            updateInstances(filters) {
                let qs = this.qs.clone().filter(filters);

                this.onUpdateInstances(qs);

                this.loadInstances(qs);
            },
            /**
             * Method - callback for updateInstances method.
             * @param {object} qs Updated QuerySet.
             */
            // eslint-disable-next-line no-unused-vars
            onUpdateInstances(qs) {},
            /**
             * Method, that generates filters for qs.
             * @param {string=} key Filter's key.
             * @param {string|number=} value Filter's value.
             * @return {Object}
             */
            generateFilters(key, value) {
                let page = 1;
                let limit = this.data.pagination.page_size;

                if (key === 'page') {
                    page = value;
                }

                let offset = limit * (page - 1);

                let filters = {
                    limit: limit,
                    offset: offset,
                };

                if (key !== 'page') {
                    filters[key] = value;
                }

                return filters;
            },
            /**
             * Method, that loads instances.
             * @param {object} qs Queryset, that should load instances.
             */
            loadInstances(qs) {
                this.show_loader = true;

                if (!qs) {
                    qs = this.qs;
                }

                qs.items()
                    .then((instances) => {
                        let data = this.data;
                        let num = qs.query.offset / data.pagination.page_size;

                        data.instances = instances;
                        data.pagination.count = qs.api_count;
                        data.pagination.page_number = num + 1;

                        this.show_modal = true;
                        this.show_loader = false;
                    })
                    .catch((error) => {
                        this.show_loader = false;
                        let str = app.error_handler.errorToString(error);

                        let srt_to_show =
                            'Some error occurred during loading data' +
                            ' for modal window. Error details: {0}'.format(str);

                        app.error_handler.showError(srt_to_show, str);
                    });
            },
        },
    };
</script>

<style></style>
