<template>
    <BootstrapModal v-if="fields.length" ref="modal">
        <template #content="{ closeModal }">
            <div class="modal-header">
                <h5 class="modal-title">
                    {{ $u.capitalize($t('filters')) }}
                </h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="container">
                    <div class="row">
                        <div class="col">
                            <component
                                :is="field.component"
                                v-for="field in fields"
                                :key="field.name"
                                :field="field"
                                :data="filtersData"
                                type="edit"
                                @set-value="setFilterValue"
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button
                    class="btn btn-default btn-close-filters-modal"
                    aria-label="Cancel"
                    @click="closeModal"
                >
                    {{ $u.capitalize($t('cancel')) }}
                </button>
                <button class="btn btn-primary btn-apply-filters" aria-label="Filter" @click="filter">
                    {{ $u.capitalize($t('apply')) }}
                </button>
            </div>
        </template>
        <template #activator>
            <OperationButton
                :title="$u.capitalize($t('filters'))"
                name="filters"
                classes="btn gui-btn btn-default btn-open-filters-modal"
                icon-classes="fas fa-filter"
                @click.native="openModal"
            />
        </template>
    </BootstrapModal>
</template>

<script>
    import Vue from 'vue';
    import { IGNORED_FILTERS, mapObjectValues } from '../../utils';
    import ModalWindowAndButtonMixin from '../../fields/ModalWindowAndButtonMixin.js';
    import OperationButton from '../common/OperationButton.vue';
    import BootstrapModal from '../BootstrapModal.vue';

    /**
     * Component for filter modal window and button, that opens it.
     */
    export default {
        name: 'FiltersModal',
        components: { BootstrapModal, OperationButton },
        mixins: [ModalWindowAndButtonMixin],
        props: {
            view: { type: Object, required: true },
        },
        data() {
            return {
                filtersData: {},
                isMounted: false,
            };
        },
        computed: {
            fields() {
                return Object.values(this.view.filters).filter((field) => !field.hidden);
            },
            filters() {
                if (this.isMounted) {
                    return this.$root.$refs.currentViewComponent.filters || {};
                }
                return {};
            },
            hasActiveFilters() {
                return (
                    Object.keys(this.filters).filter((filter) => !IGNORED_FILTERS.includes(filter)).length > 0
                );
            },
        },
        mounted() {
            this.isMounted = true;
        },
        methods: {
            openModal() {
                this.$refs.modal.open();
                this.filtersData = mapObjectValues(this.filters, (val, key) =>
                    this.view.filters[key] ? this.view.filters[key].toRepresent(this.filters) : val,
                );
            },
            setFilterValue({ field, value }) {
                Vue.set(this.filtersData, field, value);
            },
            filter() {
                this.$root.$refs.currentViewComponent.applyFieldsFilters(
                    Object.fromEntries(
                        this.fields.map((field) => [field.name, field.toInner(this.filtersData)]),
                    ),
                );
                this.$refs.modal.close();
            },
        },
    };
</script>

<style>
    .btn-open-filters-modal.active {
        background-color: var(--btn-selected-bg-color);
        color: var(--btn-selected-color);
        border-color: var(--btn-selected-border-color);
    }
    .btn-open-filters-modal.active:hover {
        background-color: var(--btn-selected-hover-bg-color);
    }
</style>
