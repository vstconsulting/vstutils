<template>
    <FileInput :file-types="mediaTypes" :text="text" :multiple="multiple" @input="emit('read-file', $event)">
        <template #append>
            <button
                v-if="showHideButton"
                class="btn input-group-text"
                :title="$tc('Hide field')"
                @click="$emit('hide')"
            >
                <i class="fa fa-minus" />
            </button>
            <button
                v-if="hasValue"
                class="btn input-group-text"
                :title="$tc('Clear field')"
                @click="$emit('clear')"
            >
                <i class="fa fa-times" />
            </button>
        </template>
    </FileInput>
</template>
<script setup lang="ts">
    import FileInput from './FileInput.vue';

    withDefaults(
        defineProps<{
            mediaTypes?: string[];
            multiple?: boolean;
            text: string;
            hasValue?: unknown;
            showHideButton?: boolean;
        }>(),
        {
            text: '',
        },
    );
    const emit = defineEmits<{
        (e: 'read-file', files: File[]): void;
        (e: 'clear'): void;
    }>();
</script>

<style scoped>
    .is-dragover {
        box-shadow: 0 0 0 0.2rem #007bff40;
        border-radius: 0.25rem;
    }
    .input-file {
        position: absolute;
        top: 0px;
        left: 0px;
        width: 100%;
        height: 100%;
        z-index: 1;
        opacity: 0;
        cursor: pointer;
        overflow: hidden;
    }

    .file-selector > * + * {
        margin-left: 0.3rem;
    }
</style>
