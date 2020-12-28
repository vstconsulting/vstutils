<template>
    <div v-if="fields.length" style="display: inline-block">
        <Modal v-show="showModal" @close="close">
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
        <button class="btn gui-btn btn-default btn-open-filters-modal" aria-label="Filters" @click="open">
            <i class="fas fa-filter" aria-hidden="true" />
            <span class="d-none d-lg-inline-block title-for-btn">{{ $t('filters') | capitalize }}</span>
        </button>
    </div>
</template>

<script>
    import Vue from 'vue';
    import Modal from '../items/modal/Modal.vue';
    import { mergeDeep } from '../../utils';
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
            };
        },
        computed: {
            fields() {
                return Object.values(this.view.filters).filter((field) => !field.hidden);
            },
            filters() {
                return this.$root.$refs.currentViewComponent.filters;
            },
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

<style scoped></style>
