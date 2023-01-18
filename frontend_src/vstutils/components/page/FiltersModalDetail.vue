<template>
    <BootstrapModal v-if="model" ref="modalRef" :title="$u.capitalize($t('filters'))">
        <template #default>
            <ModelFields
                :model="model"
                :data="sandboxData"
                editable
                flat-if-possible
                flat-fields-classes="col-12"
                @set-value="({ field, value }) => $set(sandboxData, field, value)"
            />
        </template>
        <template #footer="{ closeModal }">
            <button class="btn btn-default btn-close-filters-modal" aria-label="Cancel" @click="closeModal">
                {{ $u.capitalize($t('cancel')) }}
            </button>
            <button class="btn btn-primary btn-apply-filters" aria-label="Filter" @click="filter">
                {{ $u.capitalize($t('apply')) }}
            </button>
        </template>
        <template #activator>
            <slot :execute="openModal" />
        </template>
    </BootstrapModal>
</template>

<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { emptyRepresentData, getApp, mergeDeep } from '@/vstutils/utils';
    import BootstrapModal from '@/vstutils/components/BootstrapModal.vue';
    import ModelFields from '@/vstutils/components/page/ModelFields.vue';
    import type { PageView } from '@/vstutils/views';
    import type { DetailPageStore } from '@/vstutils/store/page';
    import type { InnerData } from '@/vstutils/utils';

    const props = defineProps<{
        view: PageView;
    }>();

    const modalRef = ref<any | null>(null);

    let sandboxData = ref(emptyRepresentData());
    const app = getApp();
    const store = app.store.page as DetailPageStore;

    const model = computed(() => {
        return props.view.filtersModelClass!;
    });

    function openModal() {
        modalRef.value.open();
        sandboxData.value = new model.value(mergeDeep({}, store.filters) as InnerData)._getRepresentData();
    }

    function filter() {
        store.applyFilters(sandboxData.value);
        modalRef.value.close();
    }
</script>
