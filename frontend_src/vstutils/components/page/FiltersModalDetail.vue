<template>
    <BootstrapModal v-if="model" ref="modalRef" :title="$u.capitalize($ts('filters'))">
        <template #default>
            <ModelFields
                v-if="instance"
                :model="model"
                :data="instance.sandbox.value"
                editable
                flat-if-possible
                flat-fields-classes="col-12"
                @set-value="(options) => instance?.sandbox.set(options)"
            />
        </template>
        <template #footer="{ closeModal }">
            <button class="btn btn-default btn-close-filters-modal" aria-label="Cancel" @click="closeModal">
                {{ $u.capitalize($ts('cancel')) }}
            </button>
            <button class="btn btn-primary btn-apply-filters" aria-label="Filter" @click="filter">
                {{ $u.capitalize($ts('apply')) }}
            </button>
        </template>
        <template #activator>
            <slot :execute="openModal" />
        </template>
    </BootstrapModal>
</template>

<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { getApp, mergeDeep } from '@/vstutils/utils';
    import BootstrapModal from '@/vstutils/components/BootstrapModal.vue';
    import ModelFields from '@/vstutils/components/page/ModelFields.vue';
    import type { PageView, ViewStore } from '@/vstutils/views';
    import type { InnerData } from '@/vstutils/utils';
    import type { Model } from '@/vstutils/models';

    const props = defineProps<{
        view: PageView;
    }>();

    const modalRef = ref<any | null>(null);

    const app = getApp();
    const store = app.store.page as ViewStore<PageView>;

    const model = computed(() => {
        return props.view.filtersModelClass!;
    });

    const instance = ref<Model>();

    function openModal() {
        modalRef.value.open();
        instance.value = new model.value(mergeDeep({}, store.filters ?? {}) as InnerData);
    }

    function filter() {
        store.applyFilters(instance.value!.sandbox.value);
        modalRef.value.close();
    }
</script>
