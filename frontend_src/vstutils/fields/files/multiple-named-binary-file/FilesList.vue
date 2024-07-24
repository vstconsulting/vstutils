<template>
    <ul>
        <li v-for="(file, idx) in files" :key="idx">
            <div class="item-wrapper">
                <span
                    title="Download file"
                    class="cursor-pointer break-word"
                    @click="fileClickHandler(file)"
                    v-text="file.name"
                />
                <button v-if="!readonly" type="button" class="btn" @click="emit('remove', idx)">
                    <i class="fa fa-times" />
                </button>
            </div>
        </li>
    </ul>
</template>

<script setup lang="ts">
    import { downloadBase64File } from '#vstutils/utils';
    import type { NamedFile } from '../named-binary-file';

    defineProps<{
        files: NamedFile[];
        readonly?: boolean;
    }>();
    const emit = defineEmits<{
        (e: 'remove', index: number): void;
    }>();

    function fileClickHandler(file: NamedFile) {
        downloadBase64File(file);
    }
</script>

<style scoped>
    .item-wrapper {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
</style>
