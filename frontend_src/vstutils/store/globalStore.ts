import { computed, ref, watch } from 'vue';
import { useParentViews } from './helpers';

import type { StoreInstance } from '@/vstutils/utils';
import type { BaseViewStore } from './page-types';

export const GLOBAL_STORE = () => {
    const page = ref<BaseViewStore | null>(null);

    const title = computed(() => {
        return page.value?.title;
    });

    const breadcrumbs = computed(() => {
        return page.value?.breadcrumbs;
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
        page,
        entityViewClasses,
        viewItems: parentViews.items,
        viewItemsMap: parentViews.itemsMap,
        setPage,
    };
};

export type GlobalStore = StoreInstance<ReturnType<typeof GLOBAL_STORE>>;

export type GlobalStoreInitialized = Omit<GlobalStore, 'page'> & {
    page: BaseViewStore;
};
