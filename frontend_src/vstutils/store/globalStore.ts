import { computed, ref, watch } from 'vue';
import type { StoreGeneric } from 'pinia';
import type { Breadcrumb } from '../breadcrumbs';

export const GLOBAL_STORE = () => {
    const page = ref<StoreGeneric>(null as unknown as StoreGeneric);

    const title = computed(() => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return page.value?.title as string | undefined;
    });

    const breadcrumbs = computed(() => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unsafe-return
        return page.value?.breadcrumbs as Breadcrumb[] | undefined;
    });

    const entityViewClasses = computed<string[]>(() => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unsafe-return
        return (page.value?.entityViewClasses as string[] | undefined) ?? [];
    });

    watch(title, (newTitle) => {
        if (newTitle) {
            document.title = newTitle;
        }
    });

    function setPage(store: StoreGeneric) {
        page.value = store;
    }

    return { title, breadcrumbs, page, entityViewClasses, setPage };
};
