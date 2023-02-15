<template>
    <SingleFileInput
        :hideable="hideable"
        :clearable="!!value"
        :field="field"
        :text="name"
        @input="readFile"
        @clear="emit('clear')"
        @hide="emit('hide-field')"
    />
</template>

<script setup lang="ts">
    import { toRef } from 'vue';
    import { readFileAsObject } from '@/vstutils/utils';
    import { FieldEditPropsDef } from '@/vstutils/fields/base';
    import SingleFileInput from '../SingleFileInput.vue';
    import { useNamedFileText, validateNamedFilesContentSize } from './utils';

    import type { ExtractRepresent, FieldEditPropsDefType } from '@/vstutils/fields/base';
    import type NamedBinaryFileField from './NamedBinaryFileField';

    const props = defineProps(FieldEditPropsDef as FieldEditPropsDefType<NamedBinaryFileField>);

    const emit = defineEmits<{
        (event: 'set-value', value: ExtractRepresent<NamedBinaryFileField> | null | undefined): void;
        (event: 'hide-field'): void;
        (event: 'clear'): void;
    }>();

    const name = useNamedFileText(toRef(props, 'value'));

    async function readFile(file: File) {
        const fileObj = await readFileAsObject(file);
        if (!validateNamedFilesContentSize(props.field, [fileObj])) {
            return;
        }
        emit('set-value', fileObj);
    }
</script>
