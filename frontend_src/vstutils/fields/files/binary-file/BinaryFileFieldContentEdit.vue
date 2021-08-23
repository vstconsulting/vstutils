<template>
    <div ref="dragZone" style="transition: all 300ms" class="input-group">
        <p
            id="file_path_input"
            class="p-as-input"
            :class="classes"
            :style="styles"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
        />

        <ReadFileButton @read-file="readFile" />
        <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
        <ClearButton @click.native="$emit('set-value', field.getInitialValue())" />
    </div>
</template>

<script>
    import BinaryFileFieldReadFileButton from './BinaryFileFieldReadFileButton.js';
    import { arrayBufferToBase64 } from '../../../utils';
    import { FileFieldContentEdit } from '../file';
    import DragAndDropMixin from '../DragAndDropMixin.js';

    export default {
        components: {
            ReadFileButton: BinaryFileFieldReadFileButton,
        },
        mixins: [FileFieldContentEdit, DragAndDropMixin],
        data: () => ({ isDragOver: false }),
        created() {
            this.styles_dict.minHeight = '38px';
        },
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

<style>
    .is-dragover {
        box-shadow: 0 0 0 0.2rem #007bff40;
        border-radius: 0.25rem;
    }
</style>
