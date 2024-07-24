<template>
    <BootstrapModal :title="$u.capitalize($t('add') + ' ' + $t('child instances'))">
        <template #default="{ closeModal }">
            <AddChild :view="view" @close="closeModal" />
        </template>
        <template #activator="{ openModal }">
            <slot :execute="openModal" />
        </template>
    </BootstrapModal>
</template>

<script setup lang="ts">
    import BootstrapModal from '#vstutils/components/BootstrapModal.vue';
    import AddChild from './AddChild.vue';
    import type { ListView } from '#vstutils/views';

    defineProps<{ view: ListView }>();
</script>
