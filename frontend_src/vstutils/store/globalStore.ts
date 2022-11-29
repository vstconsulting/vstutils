import type { Store, StoreActions, StoreGetters, StoreState } from 'pinia';
import { computed, ComputedRef, ref, watch } from 'vue';

import { BaseViewStore, useParentViews } from './helpers';

import type { Breadcrumb } from '../breadcrumbs';

export const GLOBAL_STORE = (): {
    page: ComputedRef<BaseViewStore | null>;
    title: ComputedRef<string | undefined>;
    breadcrumbs: ComputedRef<Breadcrumb[] | undefined>;
    entityViewClasses: ComputedRef<string[]>;
    viewItems: ReturnType<typeof useParentViews>['items'];
    viewItemsMap: ReturnType<typeof useParentViews>['itemsMap'];
    setPage(store: BaseViewStore): Promise<void>;
} => {
    const page = ref<BaseViewStore | null>(null);

    const title = computed(() => {
        return page.value?.title;
    });

    const breadcrumbs = computed(() => {
        return page.value?.breadcrumbs as Breadcrumb[] | undefined;
    });

    const entityViewClasses = computed(() => {
        return page.value?.entityViewClasses ?? [];
    });

    const parentViews = useParentViews();

    watch(title, (newTitle) => {
        if (newTitle) {
            document.title = newTitle;
        }
    });

    function setPage(store: BaseViewStore) {
        page.value = store;
        return parentViews.push(store);
    }

    return {
        title,
        breadcrumbs,
        page: page as ComputedRef<BaseViewStore | null>,
        entityViewClasses,
        viewItems: parentViews.items,
        viewItemsMap: parentViews.itemsMap,
        setPage,
    };
};

export type GlobalStore = Store<
    'global',
    StoreState<ReturnType<typeof GLOBAL_STORE>>,
    StoreGetters<ReturnType<typeof GLOBAL_STORE>>,
    StoreActions<ReturnType<typeof GLOBAL_STORE>>
>;

export type GlobalStoreInitialized = Omit<GlobalStore, 'page'> & { page: BaseViewStore };
