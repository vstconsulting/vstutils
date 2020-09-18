<template>
    <div v-if="is_there_any_filter_to_display" style="display: inline-block;">
        <gui_modal v-show="show_modal" @close="close">
            <template #header>
                <h3>{{ $t('filters') | capitalize }}</h3>
            </template>
            <template #body>
                <filters_wrapper :opt="opt" :view="view" :filters_data="enteredFields" />
            </template>
            <template #footer>
                <button class="btn btn-default btn-close-filters-modal" aria-label="Cancel" @click="close">
                    {{ $t('cancel') | capitalize }}
                </button>
                <button class="btn btn-primary btn-apply-filters" aria-label="Filter" @click="filter">
                    {{ $t('apply') | capitalize }}
                </button>
            </template>
        </gui_modal>
        <button class="btn gui-btn btn-default btn-open-filters-modal" aria-label="Filters" @click="open">
            <i class="fas fa-filter" aria-hidden="true" />
            <span class="d-none d-lg-inline-block title-for-btn">{{ $t('filters') | capitalize }}</span>
        </button>
    </div>
</template>

<script>
    import { ModalWindowAndButtonMixin } from '../../../fields';

    /**
     * Component for filter modal window and button, that opens it.
     */
    export default {
        name: 'gui_filters_modal',
        mixins: [ModalWindowAndButtonMixin],
        props: ['opt', 'view', 'data', 'datastore'],
        data: function () {
            return {
                enteredFields: {},
            };
        },
        computed: {
            is_there_any_filter_to_display() {
                return Object.values(this.view.schema.filters).some((filter) => !filter.options.hidden);
            },
        },
        created() {
            this.enteredFields = { ...this.datastore.data.filters };
        },
        methods: {
            filter() {
                this.$store.commit({
                    type: this.datastore.statePath + '/setFilters',
                    filters: this.enteredFields,
                });
                this.$root.$refs.currentViewComponent.filterInstances().then((error) => {
                    if (error instanceof Error && error.name === 'NavigationDuplicated') {
                        this.close();
                    }
                });
            },
        },
    };
</script>

<style scoped></style>
