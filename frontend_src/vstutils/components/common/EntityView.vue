<template>
    <div class="entity-view" :class="rootClasses">
        <Preloader v-if="loading" />
        <div :class="containerClass">
            <div class="top-row d-print-none">
                <ButtonsRow
                    v-if="!error && showTopButtons && view"
                    :view="view"
                    :actions="actions"
                    :sublinks="sublinks"
                    :style="loading ? 'visibility: hidden' : ''"
                    @execute-action="$emit('execute-action', $event)"
                    @open-sublink="$emit('open-sublink', $event)"
                />
                <portal-target name="appendButtonsRow" />
            </div>

            <SelectedFilters v-if="!error && showUsedFilters && view" :view="view" />

            <ErrorPage v-if="error" :error-data="errorData" :error="error" />

            <div v-show="showPage">
                <slot />
            </div>
        </div>
    </div>
</template>

<script>
    import Preloader from './Preloader.vue';
    import ButtonsRow from './ButtonsRow.vue';
    import SelectedFilters from './SelectedFilters.vue';
    import ErrorPage from '../ErrorPage';

    export default {
        name: 'EntityView',
        components: { ErrorPage, ButtonsRow, Preloader, SelectedFilters },
        props: {
            view: { type: Object, default: null },
            loading: { type: Boolean, required: true },
            error: { type: [Object, Error], default: () => ({}) },
            response: { type: Boolean, default: false },
            showTopButtons: { type: Boolean, default: true },
            showUsedFilters: { type: Boolean, default: true },
            isContainerFluid: { type: Boolean, default: true },
            actions: { type: Array, default: () => [] },
            sublinks: { type: Array, default: () => [] },
        },
        computed: {
            showPage() {
                return !this.error && this.response;
            },
            errorData() {
                if (this.error) {
                    return window.app.error_handler.errorToString(this.error);
                }
                return null;
            },
            containerClass() {
                return this.isContainerFluid ? 'container-fluid' : 'container';
            },
            rootClasses() {
                return this.$app.store.entityViewClasses;
            },
        },
    };
</script>

<style scoped>
    .entity-view {
        padding-top: 0.5rem;
    }
    .entity-view .top-row {
        margin-bottom: 0.5rem;
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap-reverse;
    }
</style>
