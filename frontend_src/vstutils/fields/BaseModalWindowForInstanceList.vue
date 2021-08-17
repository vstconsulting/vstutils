<template>
    <div />
</template>

<script>
    import ModalWindowAndButtonMixin from './ModalWindowAndButtonMixin.js';
    import Vue from 'vue';

    export default {
        mixins: [ModalWindowAndButtonMixin],
        data() {
            return {
                showLoader: false,
                showModal: false,
                instances: [],
                selection: [],
                pagination: {
                    count: 0,
                    pageSize: 20,
                    pageNumber: 1,
                },
            };
        },
        methods: {
            /**
             * Method, that opens modal window.
             */
            open() {
                this.showModal = true;
                this.updateInstances(this.generateFilters());
            },
            /**
             * Method, that filters instances
             * according to the filter value.
             * @param {string, number} value Filter value.
             */
            filterQuerySetItems(value) {
                let filters = this.generateFilters(this.viewField.name, value);
                this.updateInstances(filters);
            },
            /**
             * Method, that loads data for new pagination page.
             */
            goToPage(page) {
                this.updateInstances(this.generateFilters('page', page));
            },
            /**
             * Method, that updates instances list
             * according to the filters.
             * @param {object} filters Object with filters values.
             */
            updateInstances(filters) {
                this.queryset = this.queryset.clone().filter(filters);
                this.onUpdateInstances();
                this.loadInstances();
            },
            // eslint-disable-next-line no-unused-vars
            onUpdateInstances() {},
            /**
             * Method, that generates filters for qs.
             * @param {string=} key Filter's key.
             * @param {string|number=} value Filter's value.
             * @return {Object}
             */
            generateFilters(key, value) {
                let page = 1;
                let limit = this.pagination.pageSize;

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
            toggleSelection(instance) {
                const instanceId = instance.getPkValue();
                const index = this.selection.indexOf(instanceId);
                if (index === -1) {
                    this.selection.push(instanceId);
                } else {
                    Vue.delete(this.selection, index);
                }
            },
            toggleAllSelection() {
                this.selection = this.allSelected
                    ? []
                    : this.instances.map((instance) => instance.getPkValue());
            },
            /**
             * Method, that loads instances.
             */
            loadInstances() {
                this.show_loader = true;

                this.queryset
                    .items()
                    .then((instances) => {
                        const num = this.queryset.query.offset / this.pagination.pageSize;

                        this.instances = instances;
                        this.pagination.count = instances.extra.count;
                        this.pagination.page_number = num + 1;

                        this.showModal = true;
                        this.showLoader = false;
                    })
                    .catch((error) => {
                        this.showLoader = false;
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
