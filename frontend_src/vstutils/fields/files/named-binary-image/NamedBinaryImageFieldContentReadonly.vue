<template>
    <ImageBlock v-if="value && value.content" :field="field" :value="value" @click.native.stop />
</template>

<script setup lang="ts">
    import type { ExtractRepresent } from '#vstutils/fields/base';
    import type NamedBinaryImageField from './NamedBinaryImageField';
    import ImageBlock from './ImageBlock.vue';

    defineProps<{
        field: NamedBinaryImageField;
        value: ExtractRepresent<NamedBinaryImageField> | null | undefined;
    }>();
</script>
