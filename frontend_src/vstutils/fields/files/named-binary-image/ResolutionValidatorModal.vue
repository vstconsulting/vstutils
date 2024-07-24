<template>
    <BootstrapModal
        ref="modalRef"
        wrapper-classes="validator-modal"
        classes="modal-lg"
        @exit="onModalClosed"
        @shown="isOpen = true"
    >
        <ResolutionValidatorImage
            v-if="isOpen"
            :key="currentImageIdx"
            :image="image"
            :field="field"
            @crop="onCrop"
        />
    </BootstrapModal>
</template>

<script setup lang="ts">
    import { ref, computed, onMounted } from 'vue';
    import BootstrapModal from '#vstutils/components/BootstrapModal.vue';
    import ResolutionValidatorImage from './ResolutionValidatorImage.vue';
    import type { NamedFile } from '#vstutils/fields/files/named-binary-file';
    import type { IImageField } from './NamedBinaryImageField';

    const props = defineProps<{
        field: IImageField;
        images: NamedFile[];
    }>();

    const emit = defineEmits<{
        (e: 'cancel'): void;
        (e: 'validated', data: NamedFile[]): void;
    }>();

    const currentImageIdx = ref(0);
    const isOpen = ref(false);
    const modalRef = ref<any | null>(null);
    const resized: NamedFile[] = [];

    const image = computed(() => {
        return props.images[currentImageIdx.value];
    });

    onMounted(() => {
        modalRef.value!.open();
    });
    function onModalClosed() {
        emit('cancel');
        isOpen.value = false;
    }
    function onCrop(img: string) {
        resized.push({ ...image.value, content: img });
        currentImageIdx.value += 1;

        if (currentImageIdx.value === props.images.length) {
            emit('validated', resized);
            emit('cancel');
        }
    }
</script>

<style scoped>
    .validator-modal .modal-body {
        max-height: 90vh;
        overflow-y: auto;
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
    }
    @media (max-width: 991px) {
        .validator-modal .modal-header {
            padding: 0.5rem;
        }
    }
</style>
