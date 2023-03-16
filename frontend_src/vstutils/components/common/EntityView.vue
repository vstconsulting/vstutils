<template>
    <div class="entity-view" :class="rootClasses">
        <Preloader v-if="loading" />
        <div v-if="store" :class="containerClass">
            <div class="top-row d-print-none">
                <ButtonsRow
                    v-if="!store.error && store.view.showOperationButtons"
                    :view="store.view"
                    :actions="store.actions"
                    :sublinks="store.sublinks"
                    :style="store.loading ? 'visibility: hidden' : ''"
                    @execute-action="executeAction"
                    @open-sublink="openSublink"
                />
                <portal-target name="appendButtonsRow" />
            </div>

            <SelectedFilters v-if="!store.error && !store.loading && showUsedFilters" :view="store.view" />

            <ErrorPage v-if="store.error" :error-data="errorData" :error="store.error" />

            <div v-show="showPage">
                <slot />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { useRoute } from 'vue-router/composables';

    import { getApp, openSublink as _openSublink } from '@/vstutils/utils';
    import { createViewStore } from '@/vstutils/store';
    import Preloader from './Preloader.vue';
    import ButtonsRow from './ButtonsRow.vue';
    import SelectedFilters from './SelectedFilters.vue';
    import ErrorPage from '../ErrorPage.vue';

    import type { BaseViewStore } from '@/vstutils/store';
    import type { Action, Sublink } from '@/vstutils/views';

    const props = withDefaults(
        defineProps<{
            showUsedFilters?: boolean;
            isContainerFluid?: boolean;
        }>(),
        { isContainerFluid: true, showUsedFilters: true },
    );

    const app = getApp();
    const route = useRoute();

    const store = ref<BaseViewStore>();

    createViewStore(route.meta!.view, { watchQuery: true }).then((_store) => {
        store.value = _store;
    });

    const loading = computed(() => !store.value || store.value.loading);
    const showPage = computed(() => !store.value?.error && store.value?.response);
    const errorData = computed(() => {
        if (store.value?.error) {
            return app.error_handler.errorToString(store.value.error);
        }
        return null;
    });
    const containerClass = computed(() => (props.isContainerFluid ? 'container-fluid' : 'container'));
    const rootClasses = computed(() => app.store.entityViewClasses);

    function executeAction(action: Action) {
        app.actions.execute({ action, instance: app.store.page.instance });
    }

    function openSublink(sublink: Sublink) {
        _openSublink(sublink, store.value?.instance);
    }
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
