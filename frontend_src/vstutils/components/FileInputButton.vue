<template>
    <label class="btn btn-default file-input-btn">
        <input class="hidden-input" type="file" :multiple="multiple" :accept="accept" />
        <i :class="iconClass" />
        <span class="sr-only">{{ $t('Select file') }}</span>
    </label>
</template>

<script setup lang="ts">
    withDefaults(
        defineProps<{
            multiple?: boolean;
            accept?: string;
            iconClass?: string;
        }>(),
        { iconClass: 'fas fa-file-alt' },
    );
</script>

<style scoped lang="scss">
    .file-input-btn {
        position: relative;
        cursor: pointer;

        .hidden-input {
            position: absolute;
            top: 0px;
            left: 0px;
            height: 0;
            width: 0;
            opacity: 0;
            overflow: hidden;
        }
    }
</style>
