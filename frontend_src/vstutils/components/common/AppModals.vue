<template>
    <div style="display: contents">
        <ConfirmModal
            ref="saveSettingsModal"
            message="Do you want to save your changes? The page will be reloaded."
            confirm-title="Reload now"
            reject-title="Cancel"
            @confirm="saveSettings"
            @reject="rollbackSettings"
        />

        <ConfirmModal
            ref="confirmationModal"
            :message="`${$t('Confirm action')} ${confirmation.actionName}`"
            confirm-title="Confirm"
            reject-title="Cancel"
            @confirm="confirm"
            @reject="reject"
        />

        <ConfirmModal
            ref="reloadPageModal"
            message="Changes in settings are successfully saved. Please refresh the page."
            confirm-title="Reload now"
            reject-title="Later"
            @confirm="reloadPage"
        />

        <slot />
    </div>
</template>

<script setup lang="ts">
    import { ref } from 'vue';
    import { i18n } from '#vstutils/translation';
    import { getApp, saveAllSettings } from '#vstutils/utils';
    import ConfirmModal from './ConfirmModal.vue';

    const app = getApp();

    const saveSettingsModal = ref<InstanceType<typeof ConfirmModal>>();
    const confirmationModal = ref<InstanceType<typeof ConfirmModal>>();
    const reloadPageModal = ref<InstanceType<typeof ConfirmModal>>();

    const confirmation = ref<{ callback: null | (() => void); actionName: string }>({
        callback: null,
        actionName: '',
    });

    function rollbackSettings() {
        app.userSettingsStore.rollback();
        app.localSettingsStore.rollback();
    }

    function reloadPage() {
        window.location.reload();
    }

    async function saveSettings() {
        if (await saveAllSettings()) {
            reloadPage();
        }
    }

    function confirm() {
        if (confirmation.value.callback) {
            confirmation.value.callback();
            confirmation.value.callback = null;
        }
    }
    function reject() {
        confirmation.value.callback = null;
    }

    function initActionConfirmationModal(callback: () => void, actionName: string) {
        confirmation.value.callback = callback;
        confirmation.value.actionName = ` "${i18n.t(actionName)}"?`;
        confirmationModal.value!.openModal();
    }

    function openReloadPageModal() {
        reloadPageModal.value?.openModal();
    }

    function openSaveSettingsModal() {
        saveSettingsModal.value?.openModal();
    }

    defineExpose({ initActionConfirmationModal, openReloadPageModal, openSaveSettingsModal });
</script>
