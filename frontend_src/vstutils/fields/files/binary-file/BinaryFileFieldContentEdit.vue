<template>
    <FileSelector
        :show-hide-button="hasHideButton"
        :has-value="value"
        :media-types="field.allowedMediaTypes"
        :text="selectorText"
        @read-file="readFile"
        @clear="$emit('set-value', field.getInitialValue())"
        @hide="$emit('hide-field', field)"
    />
</template>

<script>
    import { arrayBufferToBase64 } from '../../../utils';
    import { FileFieldContentEdit } from '../file';
    import FileSelector from './../FileSelector.vue';

    export default {
        components: { FileSelector },
        mixins: [FileFieldContentEdit],
        methods: {
            readFile(files) {
                const file = files[0];
                if (!file || !this.$parent.validateFileSize(file.size)) return;

                const reader = new FileReader();

                reader.onload = (loadEvent) =>
                    this.$emit('set-value', arrayBufferToBase64(loadEvent.target.result));

                reader.readAsArrayBuffer(file);
            },
            dragOver() {
                this.$refs.dragZone.classList.add('is-dragover');
            },
            dragLeave() {
                this.$refs.dragZone.classList.remove('is-dragover');
            },
            dragFinished(e) {
                this.readFile(e.dataTransfer.files);
            },
        },
    };
</script>
