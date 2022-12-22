<template>
    <FileSelector
        :show-hide-button="hideable"
        :has-value="!!value"
        :media-types="field.allowedMediaTypes"
        :text="name"
        @read-file="readFile"
        @clear="emit('clear')"
        @hide="emit('hide-field')"
    />
</template>

<script setup lang="ts">
    import { toRef } from 'vue';
    import { readFileAsObject } from '@/vstutils/utils';
    import type { ExtractRepresent } from '@/vstutils/fields/base';
    import { validateFileSize } from '../file';
    import FileSelector from '../FileSelector.vue';
    import type NamedBinaryFileField from './NamedBinaryFileField';
    import { useNamedFileText } from './utils';

    const props = defineProps<{
        field: NamedBinaryFileField;
        value: ExtractRepresent<NamedBinaryFileField> | null | undefined;
        hideable?: boolean;
    }>();

    const emit = defineEmits<{
        (event: 'set-value', value: ExtractRepresent<NamedBinaryFileField> | null | undefined): void;
        (event: 'hide-field'): void;
        (event: 'clear'): void;
    }>();

    const name = useNamedFileText(toRef(props, 'value'));

    async function readFile(files: File[]) {
        const file = files[0];
        if (!file || !validateFileSize(props.field, file.size)) return;
        emit('set-value', await readFileAsObject(file));
    }
</script>
