<template>
    <div class="add-child-modal">
        <form @submit.prevent="loadInstances">
            <div v-if="filterField" class="input-group mb-3">
                <div class="input-group-prepend d-none d-sm-block">
                    <span class="input-group-text">{{ $t(filterField.title) }}</span>
                </div>
                <input ref="filterInput" type="text" class="form-control" />
                <div class="input-group-append cursor-pointer">
                    <button class="btn btn-default" type="submit" :disabled="loading">
                        <i aria-hidden="true" class="fa fa-search" />
                    </button>
                </div>
                <div class="input-group-append cursor-pointer">
                    <button class="btn btn-default" type="button" :disabled="loading" @click="clearFilter">
                        <i aria-hidden="true" class="fas fa-times" />
                    </button>
                </div>
            </div>
        </form>
        <OverlayLoader v-if="loading" />
        <template v-if="!instances.length">
            <p class="text-center">
                {{ $t('List is empty') }}
            </p>
        </template>
        <template v-else>
            <ListTable
                :instances="instances"
                :selection="selection"
                :fields="fields"
                has-multi-actions
                @toggle-selection="toggleSelection"
                @toggle-all-selection="toggleAllSelection"
            />
            <Pagination :items="paginationItems" use-emits @open-page="page = $event" />
            <button
                type="button"
                class="btn btn-primary"
                :disabled="loading || selection.length === 0"
                @click="addSelected"
            >
                {{ $t('Add') }}
            </button>
        </template>
    </div>
</template>

<script setup lang="ts">
    import { computed, ref, watch } from 'vue';
    import { useRoute } from 'vue-router/composables';

    import { i18n } from '@/vstutils/translation';
    import { formatPath, getApp, RequestTypes } from '@/vstutils/utils';
    import type { InstancesList } from '@/vstutils/store';
    import { usePagination, useSelection } from '@/vstutils/store';
    import { guiPopUp, pop_up_msg } from '@/vstutils/popUp';
    import ListTable from '@/vstutils/components/list/ListTable.vue';
    import Pagination from '@/vstutils/components/list/Pagination.vue';
    import OverlayLoader from '@/vstutils/components/OverlayLoader.vue';
    import type { ListView } from '@/vstutils/views';

    const emit = defineEmits<{
        (e: 'close'): void;
    }>();
    const props = defineProps<{
        view: ListView;
    }>();

    const limit = 10;

    const app = getApp();
    const route = useRoute();

    const loading = ref(true);
    const page = ref(1);
    const filterInput = ref<HTMLInputElement | null>(null);
    const instances = ref<InstancesList>([]);

    const { toggleAllSelection, toggleSelection, selection, setSelection } = useSelection(instances);
    const paginationItems = usePagination({
        count: computed(() => instances.value?.extra?.count ?? 0),
        page,
        size: ref(limit),
    });

    const queryset = props.view.nestedQueryset!.formatPath(route.params);
    const modelClass = queryset.getResponseModelClass(RequestTypes.LIST);
    const filterField = modelClass.viewField;
    const fields = Array.from(modelClass.fields.values()).filter(
        (field) => !modelClass.hidden && field !== modelClass.pkField,
    );

    async function loadInstances() {
        loading.value = true;
        const filters: Record<string, unknown> = { limit, offset: limit * (page.value - 1) };
        if (filterInput.value) {
            filters[filterField.name] = filterInput.value.value;
        }
        try {
            const loaded = await queryset.filter(filters).items();
            instances.value = loaded;
        } catch (e) {
            app.error_handler.defineErrorAndShow(e);
        }
        loading.value = false;
    }

    function clearFilter() {
        filterInput.value!.value = '';
        loadInstances();
    }

    async function addSelected() {
        loading.value = true;

        const view = app.store.page.view;
        const qs = view.objects!.formatPath(route.params);
        const path = formatPath(view.path, queryset.pathParamsValues);

        const results = await Promise.allSettled(
            selection.value.map((id) =>
                qs.execute({
                    method: 'post',
                    path,
                    data: { id },
                }),
            ),
        );

        setSelection([]);

        for (const result of results) {
            if (result.status === 'fulfilled') {
                guiPopUp.success(i18n.t(pop_up_msg.instance.success.add, [i18n.t(view.title)]) as string);
            } else {
                const str = app.error_handler.errorToString(result.reason);
                const srt_to_show = i18n.t(pop_up_msg.instance.error.add, [i18n.t(view.title), str]);
                app.error_handler.showError(srt_to_show as string, str);
            }
        }

        loading.value = false;
        emit('close');
    }

    watch([page], loadInstances);

    loadInstances();
</script>
