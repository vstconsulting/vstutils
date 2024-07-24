<template>
    <div>
        <div>
            {{ text }}
        </div>
        <FilesList v-if="value && value.length > 0" :files="value" readonly />
    </div>
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import { i18n } from '#vstutils/translation';
    import FilesList from './FilesList.vue';

    import type { ExtractRepresent } from '#vstutils/fields/base';
    import type MultipleNamedBinaryFileField from './MultipleNamedBinaryFileField';

    const props = defineProps<{
        value: ExtractRepresent<MultipleNamedBinaryFileField> | null | undefined;
    }>();

    const text = computed(() => {
        return i18n.tc('file n selected', props.value?.length ?? 0);
    });
</script>
