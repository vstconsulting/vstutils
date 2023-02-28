<template>
    <BootstrapModal ref="modal" :title="$ts(title)" @exit="closeCallback">
        <template #body>
            <div>
                <p>
                    {{ $t(message) }}
                </p>
            </div>
        </template>
        <template #footer>
            <button class="btn btn-success" @click="callConfirm">
                {{ $t(confirmTitle) }}
            </button>
            <button class="btn btn-secondary" style="float: right" @click="callReject">
                {{ $t(rejectTitle) }}
            </button>
        </template>
    </BootstrapModal>
</template>

<script setup lang="ts">
    import { ref } from 'vue';
    import BootstrapModal from '../BootstrapModal.vue';

    defineProps({
        title: { type: String, default: 'Confirm action' },
        message: { type: String, default: '' },
        confirmTitle: { type: String, default: 'Yes' },
        rejectTitle: { type: String, default: 'No' },
    });

    const emit = defineEmits<{
        (e: 'confirm'): void;
        (e: 'reject'): void;
    }>();

    const modal = ref<InstanceType<typeof BootstrapModal> | null>(null);

    let isActioned = false;

    function callConfirm() {
        modal.value!.close();
        isActioned = true;
        emit('confirm');
    }
    function callReject() {
        modal.value!.close();
        isActioned = true;
        emit('reject');
    }
    function closeCallback() {
        if (!isActioned) {
            callReject();
        }
    }
    function openModal() {
        isActioned = false;
        if (!modal.value!.isOpen) {
            modal.value!.open();
        }
    }

    function closeModal() {
        modal.value!.close();
    }

    defineExpose({ openModal, closeModal });
</script>
