<template>
    <FileSelector
        :show-hide-button="hasHideButton"
        :has-value="value"
        :media-types="field.allowedMediaTypes"
        :text="selectorText"
        @read-file="readFile"
        @clear="clearValue"
        @hide="$emit('hide-field', field)"
    />
</template>

<script lang="ts">
    import { defineComponent } from 'vue';
    import { arrayBufferToBase64 } from '../../../utils';
    import { FileFieldContentEdit } from '../file';
    import { validateFileSize } from '../file';
    import FileSelector from './../FileSelector.vue';

    export default defineComponent({
        components: { FileSelector },
        extends: FileFieldContentEdit,
        methods: {
            readFile(files: File[]) {
                const file = files[0];
                if (!file || !validateFileSize(this.field, file.size)) return;

                const reader = new FileReader();

                reader.onload = () =>
                    this.$emit('set-value', arrayBufferToBase64(reader.result as ArrayBuffer));

                reader.readAsArrayBuffer(file);
            },
        },
    });
</script>
