<template>
    <div v-if="fields.length" style="display: inline-block">
        <Modal v-show="showModal" @apply="filter" @close="close">
            <template #header>
                <h3>{{ $t('filters') | capitalize }}</h3>
            </template>
            <template #body>
                <div class="row">
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
            </template>
            <template #footer>
                <button class="btn btn-default btn-close-filters-modal" aria-label="Cancel" @click="close">
                    {{ $t('cancel') | capitalize }}
                </button>
                <button class="btn btn-primary btn-apply-filters" aria-label="Filter" @click="filter">
                    {{ $t('apply') | capitalize }}
                </button>
            </template>
        </Modal>
        <button
            class="btn gui-btn btn-default btn-open-filters-modal"
            :class="{ active: hasActiveFilters }"
            aria-label="Filters"
            @click="open"
        >
            <i class="fas fa-filter" aria-hidden="true" />
            <span class="d-none d-lg-inline-block title-for-btn">{{ $t('filters') | capitalize }}</span>
        </button>
    </div>
</template>

<script>
    import Vue from 'vue';
    import Modal from '../items/modal/Modal.vue';
    import { IGNORED_FILTERS, mergeDeep } from '../../utils';
    import ModalWindowAndButtonMixin from '../../fields/ModalWindowAndButtonMixin.js';

    /**
     * Component for filter modal window and button, that opens it.
     */
    export default {
        name: 'FiltersModal',
        components: { Modal },
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
            onOpen() {
                this.filtersData = mergeDeep({}, this.filters);
            },
            setFilterValue({ field, value }) {
                Vue.set(this.filtersData, field, value);
            },
            filter() {
                this.$root.$refs.currentViewComponent.applyFilters(this.filtersData);
                this.close();
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
