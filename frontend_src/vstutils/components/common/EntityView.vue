<template>
    <div class="entity-view">
        <Preloader v-if="loading" />
        <div :class="containerClass">
            <div class="row">
                <header class="col-12">
                    <h1>
                        <span v-if="showBackButton" class="btn btn-default btn-previous-page" @click="goBack">
                            <span class="fa fa-arrow-left" />
                        </span>
                        <span v-text="capitalizedTitle" />
                        <slot name="additionalTitleInfo" />
                    </h1>
                    <Breadcrumbs v-if="breadcrumbs" :items="breadcrumbs" />
                </header>
            </div>

            <ButtonsRow
                v-if="!error && showTopButtons"
                :view="view"
                :actions="actions"
                :sublinks="sublinks"
                @execute-action="$emit('execute-action', $event)"
                @open-sublink="$emit('open-sublink', $event)"
            />

            <SelectedFilters v-if="!error && showUsedFilters" :view="view" />

            <div class="row">
                <section class="col-lg-12">
                    <div v-if="error" class="error-text-wrapper">
                        <p class="text-center error-p" v-html="errorData" />
                    </div>
                    <slot v-else-if="response" />
                </section>
            </div>
        </div>
    </div>
</template>

<script>
    import Preloader from './Preloader.vue';
    import Breadcrumbs from './Breadcrumbs.vue';
    import ButtonsRow from './ButtonsRow.vue';
    import { capitalize, formatPath } from '../../utils';
    import SelectedFilters from './SelectedFilters.vue';

    /**
     * Function that checks if first letter is in upper case
     * @param {string} word
     */
    function initialIsCapital(word) {
        return word[0] !== word[0].toLowerCase();
    }

    export default {
        name: 'EntityView',
        components: { ButtonsRow, Breadcrumbs, Preloader, SelectedFilters },
        props: {
            view: { type: Object, required: true },
            loading: { type: Boolean, required: true },
            error: { required: true },
            response: { required: true },
            title: { type: String, required: true },
            breadcrumbs: { type: Array, required: false, default: undefined },
            showBackButton: { type: Boolean, required: false, default: true },
            showTopButtons: { type: Boolean, required: false, default: true },
            showUsedFilters: { type: Boolean, required: false, default: true },
            isContainerFluid: { type: Boolean, required: false, default: true },
            actions: { type: Array, required: false, default: () => [] },
            sublinks: { type: Array, required: false, default: () => [] },
        },
        computed: {
            capitalizedTitle() {
                if (this.error) return 'Error';

                if (initialIsCapital(this.title)) {
                    return this.title;
                }
                return capitalize(this.$t(this.title.toLowerCase().replace(/_/g, ' ')));
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
        },
        methods: {
            goBack() {
                const parentPath = this.view.parent?.path;
                if (parentPath) {
                    return this.$router.push({ path: formatPath(parentPath, this.$route.params) });
                }
                return this.$router.push({ name: 'home' });
            },
        },
    };
</script>

<style scoped>
    .entity-view {
        padding-top: 1rem;
    }

    header {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
    }
    header h1 {
        font-size: 2rem;
    }
</style>
