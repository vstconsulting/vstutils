import { computed, getCurrentInstance, readonly, ref, watch } from 'vue';
import type { QuerySet } from '@/vstutils/querySet';

import { getApp } from '@/vstutils/utils';

import type { Ref } from 'vue';
import type { FKField, TRepresent } from './FKField';

export function useQuerySets(field: FKField, data: Record<string, unknown>) {
    const app = getApp();
    const querysets = computed(() => {
        return field.getAllQuerysets(app.store.page.view.path);
    });
    const queryset = computed(() => {
        return field.getAppropriateQuerySet({ data, querysets: querysets.value });
    });

    return { querysets, queryset };
}

export function ensureValueFetched(
    field: FKField,
    queryset: QuerySet,
    value: Ref<TRepresent | null | undefined>,
) {
    const vm = getCurrentInstance();
    const loading = ref(false);

    watch(
        value,
        async (value) => {
            if (!value || typeof value === 'object' || !field.fetchData) {
                return;
            }
            loading.value = true;
            try {
                const [instance] = await field._fetchRelated([value], queryset);
                if (instance && typeof instance === 'object') {
                    vm?.proxy.$emit('set-value', instance, { markChanged: false });
                }
            } catch (e) {
                getApp().error_handler.defineErrorAndShow(e);
            }
            loading.value = false;
        },
        { immediate: true },
    );

    return { loading: readonly(loading) };
}
