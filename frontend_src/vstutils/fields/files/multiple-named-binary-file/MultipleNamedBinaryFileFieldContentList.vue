<template>
    <BootstrapModal v-if="value && value.length > 0" styles="width: 90vw; max-width: 1000px" :title="title">
        <FilesList :files="value" readonly />

        <template #activator="{ openModal }">
            <button type="button" class="btn">
                <i class="fas fa-file-alt" style="font-size: 1.5rem" @click.stop="openModal" />
            </button>
        </template>
    </BootstrapModal>
</template>

<script setup lang="ts">
    import BootstrapModal from '@/vstutils/components/BootstrapModal.vue';
    import type { ExtractRepresent } from '@/vstutils/fields/base';
    import type MultipleNamedBinaryFileField from './MultipleNamedBinaryFileField';
    import FilesList from './FilesList.vue';
    import { i18n } from '@/vstutils/translation';
    import { computed } from 'vue';

    const props = defineProps<{
        field: MultipleNamedBinaryFileField;
        value: ExtractRepresent<MultipleNamedBinaryFileField> | null | undefined;
    }>();

    const title = computed(() => {
        return `${i18n.t('File list')} (${i18n.t(props.field.title)})`;
    });
</script>
