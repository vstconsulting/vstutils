<template>
    <div class="entity-view" :class="rootClasses">
        <Preloader v-if="loading" />
        <div :class="containerClass">
            <div class="top-row d-print-none">
                <ButtonsRow
                    v-if="!error && view && view.showOperationButtons"
                    :view="view"
                    :actions="actions"
                    :sublinks="sublinks"
                    :style="loading ? 'visibility: hidden' : ''"
                    @execute-action="$emit('execute-action', $event)"
                    @open-sublink="$emit('open-sublink', $event)"
                />
                <portal-target name="appendButtonsRow" />
            </div>

            <SelectedFilters v-if="!error && !loading && showUsedFilters && view" :view="view" />

            <ErrorPage v-if="error" :error-data="errorData" :error="error" />

            <div v-show="showPage">
                <slot />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import { getApp } from '@/vstutils/utils';
    import Preloader from './Preloader.vue';
    import ButtonsRow from './ButtonsRow.vue';
    import SelectedFilters from './SelectedFilters.vue';
    import ErrorPage from '../ErrorPage.vue';
    import type { Action, IView, Sublink } from '@/vstutils/views';

    const props = withDefaults(
        defineProps<{
            view: IView | null;
            loading: boolean;
            error: unknown;
            response: unknown;
            showUsedFilters?: boolean;
            isContainerFluid?: boolean;
            actions?: Action[];
            sublinks?: Sublink[];
        }>(),
        { actions: () => [], sublinks: () => [], isContainerFluid: true, showUsedFilters: true },
    );

    const app = getApp();

    const showPage = computed(() => !props.error && props.response);
    const errorData = computed(() => {
        if (props.error) {
            return app.error_handler.errorToString(props.error);
        }
        return null;
    });
    const containerClass = computed(() => (props.isContainerFluid ? 'container-fluid' : 'container'));
    const rootClasses = computed(() => app.store.entityViewClasses);
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
