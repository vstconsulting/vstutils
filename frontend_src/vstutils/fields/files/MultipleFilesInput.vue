<template>
    <div style="display: contents">
        <FileFieldSelector
            :hideable="hideable"
            :clearable="clearable"
            :field="field"
            :text="text"
            multiple
            @input="readFiles"
            @clear="emit('clear')"
            @hide="emit('hide')"
        />
        <FileNamesEditor
            v-if="filesToRename.length > 0"
            style="margin-top: 1rem"
            :files="filesToRename"
            :max-length="maxNameLength"
            :min-length="minNameLength"
            @done="readFiles"
            @cancel="filesToRename = []"
        />
    </div>
</template>

<script setup lang="ts">
    import { ref, toRef } from 'vue';
    import { useFileNameValidator } from './named-binary-file/utils';
    import FileNamesEditor from './FileNamesEditor.vue';
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
        (e: 'input', files: File[]): void;
        (e: 'clear'): void;
        (e: 'hide'): void;
    }>();

    const {
        validate: validateName,
        maxLength: maxNameLength,
        minLength: minNameLength,
    } = useFileNameValidator(toRef(props, 'field'));

    const filesToRename = ref<File[]>([]);

    function readFiles(files: File[]) {
        filesToRename.value = [];

        if (files.some((file) => !validateName(file))) {
            filesToRename.value = files;
            return;
        }

        emit('input', files);
    }
</script>
