<template>
    <div>
        <MultipleFilesInput
            :hideable="hideable"
            :clearable="value && value.length > 0"
            :field="field"
            :text="text"
            @input="readFiles"
            @clear="emit('clear')"
            @hide="emit('hide-field')"
        />
        <FilesList v-if="value && value.length > 0" :files="value" @remove="removeFile" />
    </div>
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import { i18n } from '#vstutils/translation';
    import { readFileAsObject } from '#vstutils/utils';
    import { FieldEditPropsDef } from '#vstutils/fields/base';
    import MultipleFilesInput from '../MultipleFilesInput.vue';
    import FilesList from './FilesList.vue';

    import type { ExtractRepresent, FieldEditPropsDefType } from '#vstutils/fields/base';
    import type MultipleNamedBinaryFileField from './MultipleNamedBinaryFileField';

    const props = defineProps(FieldEditPropsDef as FieldEditPropsDefType<MultipleNamedBinaryFileField>);

    const emit = defineEmits<{
        (event: 'set-value', value: ExtractRepresent<MultipleNamedBinaryFileField> | null | undefined): void;
        (event: 'hide-field'): void;
        (event: 'clear'): void;
    }>();

    const text = computed(() => {
        return i18n.tc('file n selected', props.value?.length ?? 0);
    });

    function removeFile(index: number) {
        let v = props.value ? [...props.value] : [];
        v.splice(index, 1);
        emit('set-value', v);
    }

    async function readFiles(files: File[]) {
        const filesObj = [];
        for (const file of files) {
            filesObj.push(await readFileAsObject(file));
        }
        emit('set-value', [...(props.value ?? []), ...filesObj]);
    }
</script>
