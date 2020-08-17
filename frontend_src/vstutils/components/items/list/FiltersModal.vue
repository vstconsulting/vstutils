<template>
    <div style="display: inline-block;" v-if="is_there_any_filter_to_display">
        <gui_modal v-show="show_modal" @close="close">
            <template v-slot:header>
                <h3>{{ $t('filters') | capitalize }}</h3>
            </template>
            <template v-slot:body>
                <filters_wrapper :opt="opt" :view="view" :filters_data="data.filters"></filters_wrapper>
            </template>
            <template v-slot:footer>
                <button class="btn btn-default btn-close-filters-modal" @click="close" aria-label="Cancel">
                    {{ $t('cancel') | capitalize }}
                </button>
                <button class="btn btn-primary btn-apply-filters" @click="filter" aria-label="Filter">
                    {{ $t('apply') | capitalize }}
                </button>
            </template>
        </gui_modal>
        <button class="btn gui-btn btn-default btn-open-filters-modal" @click="open" aria-label="Filters">
            <i class="fas fa-filter" aria-hidden="true"></i>
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
        props: ['opt', 'view', 'data'],
        computed: {
            is_there_any_filter_to_display() {
                return Object.values(this.view.schema.filters).some((filter) => !filter.options.hidden);
            },
        },
        methods: {
            filter() {
                this.$root.$refs.currentViewComponent.filterInstances();
            },
        },
    };
</script>

<style scoped></style>
