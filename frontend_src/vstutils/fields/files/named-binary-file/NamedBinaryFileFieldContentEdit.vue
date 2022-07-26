<template>
    <FileSelector
        :show-hide-button="hasHideButton"
        :has-value="value"
        :media-types="field.allowedMediaTypes"
        :text="val"
        @read-file="readFile"
        @clear="$emit('set-value', field.getInitialValue())"
        @hide="$emit('hide-field', field)"
    />
</template>

<script>
    import { BinaryFileFieldContentEdit } from '../binary-file';
    import NamedBinaryFileFieldContent from './NamedBinaryFileFieldContent.js';
    import { readFileAsObject } from '../../../utils';
    import FileSelector from '../FileSelector.vue';

    export default {
        components: { FileSelector },
        mixins: [BinaryFileFieldContentEdit, NamedBinaryFileFieldContent],
        methods: {
            async readFile(files) {
                const file = files[0];
                if (!file || !this.$parent.validateFileSize(file.size)) return;
                this.$emit('set-value', await readFileAsObject(file));
            },
        },
    };
</script>
