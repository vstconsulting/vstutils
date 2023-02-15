<template>
    <FileRenameInput
        v-if="renaming"
        :file="renaming"
        :max-length="maxNameLength"
        :min-length="minNameLength"
        @done="readFile([$event])"
    />
    <FileFieldSelector
        v-else
        :hideable="hideable"
        :clearable="clearable"
        :field="field"
        :text="text"
        @input="readFile"
        @clear="emit('clear')"
        @hide="emit('hide')"
    />
</template>

<script setup lang="ts">
    import { ref, toRef } from 'vue';
    import { useFileNameValidator } from './named-binary-file/utils';
    import FileRenameInput from './FileRenameInput.vue';
    import FileFieldSelector from './FileFieldSelector.vue';

    import type { IFileField } from './file';

    const props = defineProps<{
        field: IFileField;
        text: string;
        multiple?: boolean;
        clearable?: unknown;
        hideable?: boolean;
    }>();

    const emit = defineEmits<{
        (e: 'input', file: File): void;
        (e: 'clear'): void;
        (e: 'hide'): void;
    }>();

    const renaming = ref<File>();

    const {
        validate: validateName,
        maxLength: maxNameLength,
        minLength: minNameLength,
    } = useFileNameValidator(toRef(props, 'field'));

    async function readFile(files: File[]) {
        renaming.value = undefined;
        const file = files[0];
        if (!file) return;
        if (!validateName(file)) {
            renaming.value = file;
            return;
        }
        emit('input', file);
    }
</script>
