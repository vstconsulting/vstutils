<template>
    <div class="input-group">
        <p
            class="p-as-input"
            :class="classes"
            :style="styles"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
        >
            {{ val }}
        </p>

        <ReadFileButton @read-file="readFile" />
        <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
        <ClearButton @click.native="$emit('set-value', field.getInitialValue())" />
    </div>
</template>

<script>
    import { BinaryFileFieldContentEdit } from '../binary-file';
    import NamedBinaryFileFieldContent from './NamedBinaryFileFieldContent.js';
    import { guiPopUp } from '../../../popUp';
    import { arrayBufferToBase64 } from '../../../utils';

    export default {
        mixins: [BinaryFileFieldContentEdit, NamedBinaryFileFieldContent],
        methods: {
            isFileSizeValid(file_size) {
                if (this.field.maxSize !== undefined) {
                    return this.field.maxSize <= file_size;
                }
                return true;
            },
            readFile(event) {
                const file = event.target.files[0];
                if (!file) return;

                if (!this.isFileSizeValid(file.size)) {
                    guiPopUp.error('File is too large');
                    console.log('File is too large ' + file.size);
                    return;
                }

                const reader = new FileReader();

                reader.onload = (loadEvent) =>
                    this.$emit('set-value', {
                        name: file.name || null,
                        content: arrayBufferToBase64(loadEvent.target.result),
                    });

                reader.readAsArrayBuffer(file);
            },
        },
    };
</script>

<style scoped></style>
