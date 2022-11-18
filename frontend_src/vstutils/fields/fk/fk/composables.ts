import { QuerySet } from '@/vstutils/querySet';
import { getApp } from '@/vstutils/utils';
import { computed, Ref, getCurrentInstance, watchEffect } from 'vue';
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
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    watchEffect(async () => {
        if (!value.value || typeof value.value === 'object' || !field.fetchData) {
            return;
        }
        const [instance] = await field._fetchRelated([value.value], queryset);
        if (instance && typeof instance === 'object') {
            vm?.proxy.$emit('set-value', instance, { markChanged: false });
        }
    });
}
