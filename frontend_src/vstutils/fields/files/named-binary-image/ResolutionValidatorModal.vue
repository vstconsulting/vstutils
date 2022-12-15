<template>
    <BootstrapModal ref="modalRef" classes="modal-lg" @exit="onModalClosed" @shown="isOpen = true">
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
    import BootstrapModal from '@/vstutils/components/BootstrapModal.vue';
    import ResolutionValidatorImage from './ResolutionValidatorImage.vue';
    import type { NamedBinaryFileField } from '@/vstutils/fields/files/named-binary-file';

    type Image = { content: string; mediaType: string; name: string };

    const props = defineProps<{
        field: NamedBinaryFileField;
        images: Image[];
    }>();

    const emit = defineEmits<{
        (e: 'cancel'): void;
        (e: 'validated', data: Image[]): void;
    }>();

    const currentImageIdx = ref(0);
    const isOpen = ref(false);
    const modalRef = ref<any | null>(null);
    const resized: Image[] = [];

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
        }
    }
</script>
