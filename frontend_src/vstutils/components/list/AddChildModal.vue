<template>
    <BootstrapModal :title="$u.capitalize($t('add') + ' ' + $t('child instances'))">
        <template #default="{ closeModal }">
            <AddChild :view="view" @close="closeModal" />
        </template>
        <template #activator="{ openModal }">
            <OperationButton
                :title="title"
                classes="btn btn-primary btn-operation-add"
                icon-classes="fa fa-folder-open"
                @click.native="openModal"
            />
        </template>
    </BootstrapModal>
</template>

<script setup lang="ts">
    import { capitalize } from '@/vstutils/utils';
    import { i18n } from '@/vstutils/translation';
    import OperationButton from '@/vstutils/components/common/OperationButton.vue';
    import BootstrapModal from '@/vstutils/components/BootstrapModal.vue';
    import AddChild from './AddChild.vue';
    import type { ListView } from '@/vstutils/views';

    defineProps<{ view: ListView }>();

    const title = capitalize(i18n.ts('add'));
</script>

<style scoped>
    .btn-operation-add {
        order: -10;
        margin-right: 5px;
    }
</style>
