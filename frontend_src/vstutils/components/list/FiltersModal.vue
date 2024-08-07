<template>
    <BootstrapModal v-if="fields.length" ref="modal" :title="$u.capitalize($ts('filters'))">
        <div class="filters-container">
            <component
                :is="field.getComponent()"
                v-for="field in fields"
                :key="field.name"
                :field="field"
                :data="filtersData"
                type="edit"
                @set-value="setFilterValue"
            />
        </div>
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

<script lang="ts" setup>
    import { computed, ref, set } from 'vue';
    import { emptyRepresentData, getApp, mapObjectValues } from '#vstutils/utils';
    import BootstrapModal from '../BootstrapModal.vue';
    import type { RepresentData } from '#vstutils/utils';
    import type { ListView, ViewStore } from '#vstutils/views';
    import type { SetFieldValueOptions } from '#vstutils/fields/base';

    const props = defineProps<{
        view: ListView;
    }>();

    const app = getApp();
    const filtersData = ref(emptyRepresentData());
    const modal = ref<InstanceType<typeof BootstrapModal> | null>(null);

    const store = computed(() => app.store.page as ViewStore<ListView>);

    const fields = computed(() => {
        return Object.values(props.view.filters).filter((field) => !field.hidden);
    });
    const filters = computed(() => {
        return store.value.filters;
    });

    function openModal() {
        modal.value!.open();
        filtersData.value = mapObjectValues(filters.value, (val: unknown, key: string) =>
            props.view.filters[key] ? props.view.filters[key].toRepresent(filters.value) : val,
        ) as RepresentData;
    }
    function setFilterValue({ field, value }: SetFieldValueOptions) {
        set(filtersData.value, field, value);
    }
    function filter() {
        store.value.applyFieldsFilters(
            Object.fromEntries(fields.value.map((field) => [field.name, field.toInner(filtersData.value)])),
        );
        modal.value!.close();
    }
</script>

<style scoped>
    .filters-container {
        display: grid;
        grid-template-columns: 1fr;
    }
</style>
