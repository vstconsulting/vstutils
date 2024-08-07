<template>
    <BootstrapModal :title="imageAlt">
        <img style="max-height: 80vh" :src="src" :alt="imageAlt" class="image-field-content" />
        <template #activator="{ openModal }">
            <div
                class="preview-img"
                :style="{ backgroundImage: cssSrc, ...previewStyle }"
                @click.stop="openModal"
            />
        </template>
    </BootstrapModal>
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import { i18n } from '#vstutils/translation';
    import { makeDataImageUrl } from '#vstutils/utils';
    import BootstrapModal from '#vstutils/components/BootstrapModal.vue';
    import type { CSSProperties } from 'vue/types/jsx';
    import type { Field } from '#vstutils/fields/base';
    import type { NamedFile } from '../named-binary-file';

    const props = defineProps<{
        value?: NamedFile | null;
        field: Field;
        previewStyle?: CSSProperties;
    }>();

    const src = computed(() => {
        if (props.value?.content) {
            return makeDataImageUrl(props.value);
        }
        return undefined;
    });

    const cssSrc = computed(() => {
        if (src.value) {
            return `url("${src.value}")`;
        }
        return undefined;
    });

    const imageAlt = computed(() => {
        return i18n.ts(props.field.title);
    });
</script>

<style scoped>
    .preview-img {
        width: 100%;
        height: 100%;
        background-repeat: no-repeat;
        background-size: contain;
        background-position: center;
        min-height: 47px;
        cursor: pointer;
    }

    :is(.type-readonly, .type-edit) .preview-img::v-deep {
        height: 150px;
    }
</style>
