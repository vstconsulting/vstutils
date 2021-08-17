<template>
    <div class="entity-view">
        <Preloader v-if="loading" />
        <div :class="containerClass">
            <div class="top-row">
                <ButtonsRow
                    v-if="!error && showTopButtons"
                    :view="view"
                    :actions="actions"
                    :sublinks="sublinks"
                    @execute-action="$emit('execute-action', $event)"
                    @open-sublink="$emit('open-sublink', $event)"
                />
            </div>

            <SelectedFilters v-if="!error && showUsedFilters" :view="view" />

            <div v-if="error" class="row">
                <section class="col-lg-12">
                    <div class="error-text-wrapper">
                        <!-- eslint-disable-next-line vue/no-v-html -->
                        <p class="text-center error-p" v-html="errorData" />
                    </div>
                </section>
            </div>
            <slot v-else-if="response" />
        </div>
    </div>
</template>

<script>
    import Preloader from './Preloader.vue';
    import ButtonsRow from './ButtonsRow.vue';
    import SelectedFilters from './SelectedFilters.vue';

    export default {
        name: 'EntityView',
        components: { ButtonsRow, Preloader, SelectedFilters },
        props: {
            view: { type: Object, required: true },
            loading: { type: Boolean, required: true },
            error: { type: Object, default: () => {} },
            response: { type: Boolean, default: false },
            showTopButtons: { type: Boolean, default: true },
            showUsedFilters: { type: Boolean, default: true },
            isContainerFluid: { type: Boolean, default: true },
            actions: { type: Array, default: () => [] },
            sublinks: { type: Array, default: () => [] },
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
