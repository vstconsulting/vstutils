<template>
    <FileInput
        :file-types="field.allowedMediaTypes"
        :text="text"
        :multiple="multiple"
        :disabled="disabled"
        @input="emit('input', $event)"
    >
        <template #append>
            <button
                v-if="hideable"
                class="btn input-group-text"
                :title="$ts('Hide field')"
                @click="emit('hide')"
            >
                <i class="fa fa-minus" />
            </button>
            <button
                v-if="clearable"
                class="btn input-group-text"
                :title="$ts('Clear field')"
                @click="emit('clear')"
            >
                <i class="fa fa-times" />
            </button>
        </template>
    </FileInput>
</template>

<script setup lang="ts">
    import FileInput from './FileInput.vue';
    import type { IFileField } from './file';

    defineProps<{
        field: IFileField;
        text: string;
        multiple?: boolean;
        clearable?: unknown;
        hideable?: boolean;
        disabled?: boolean;
    }>();
    const emit = defineEmits<{
        (e: 'input', files: File[]): void;
        (e: 'clear'): void;
        (e: 'hide'): void;
    }>();
</script>
