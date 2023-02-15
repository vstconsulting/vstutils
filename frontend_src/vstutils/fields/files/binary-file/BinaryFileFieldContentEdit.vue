<template>
    <FileFieldSelector
        :hideable="hasHideButton"
        :clearable="value"
        :field="field"
        :text="selectorText"
        @input="readFile"
        @clear="clearValue"
        @hide="$emit('hide-field', field)"
    />
</template>

<script lang="ts">
    import { defineComponent } from 'vue';
    import { arrayBufferToBase64 } from '../../../utils';
    import { FileFieldContentEdit } from '../file';
    import FileFieldSelector from './../FileFieldSelector.vue';

    export default defineComponent({
        components: { FileFieldSelector },
        extends: FileFieldContentEdit,
        methods: {
            readFile(files: File[]) {
                const file = files[0];
                if (!file) return;

                const reader = new FileReader();

                reader.onload = () =>
                    this.$emit('set-value', arrayBufferToBase64(reader.result as ArrayBuffer));

                reader.readAsArrayBuffer(file);
            },
        },
    });
</script>
