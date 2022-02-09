<template>
    <div class="entity-view" :class="rootClasses">
        <Preloader v-if="loading" />
        <div :class="containerClass">
            <div class="top-row d-print-none">
                <ButtonsRow
                    v-if="!error && showTopButtons"
                    :view="view"
                    :actions="actions"
                    :sublinks="sublinks"
                    @execute-action="$emit('execute-action', $event)"
                    @open-sublink="$emit('open-sublink', $event)"
                />
                <portal-target name="appendButtonsRow" />
            </div>

            <SelectedFilters v-if="!error && showUsedFilters" :view="view" />

            <ErrorPage v-if="error" :error-data="errorData" :error="error" />
            <slot v-else-if="response" />
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
        provide() {
            return {
                entityViewClasses: {
                    add: this.addClasses,
                    remove: this.removeClasses,
                },
            };
        },
        props: {
            view: { type: Object, required: true },
            loading: { type: Boolean, required: true },
            error: { type: [Object, Error], default: () => ({}) },
            response: { type: Boolean, default: false },
            showTopButtons: { type: Boolean, default: true },
            showUsedFilters: { type: Boolean, default: true },
            isContainerFluid: { type: Boolean, default: true },
            actions: { type: Array, default: () => [] },
            sublinks: { type: Array, default: () => [] },
        },
        data() {
            return {
                rootClasses: [],
            };
        },
        computed: {
            errorData() {
                if (this.error) {
                    return window.app.error_handler.errorToString(this.error);
                }
                return null;
            },
            containerClass() {
                return this.isContainerFluid ? 'container-fluid' : 'container';
            },
        },
        methods: {
            addClasses(classes) {
                if (typeof classes === 'string') classes = [classes];
                this.rootClasses = this.rootClasses.concat(classes);
            },
            removeClasses(classes) {
                if (typeof classes === 'string') classes = [classes];
                classes.forEach((c) => {
                    const idx = this.rootClasses.indexOf(c);
                    if (idx !== -1) this.rootClasses.splice(idx, 1);
                });
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
