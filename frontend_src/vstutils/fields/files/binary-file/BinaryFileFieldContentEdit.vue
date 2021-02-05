<template>
    <div class="input-group">
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
    import BinaryFileFieldReadFileButton from './BinaryFileFieldReadFileButton.vue';
    import { arrayBufferToBase64 } from '../../../utils';
    import { FileFieldContentEdit } from '../file';

    export default {
        components: {
            /**
             * Component for 'open file' button.
             */
            ReadFileButton: BinaryFileFieldReadFileButton,
        },
        mixins: [FileFieldContentEdit],
        created() {
            this.styles_dict.minHeight = '38px';
        },
        methods: {
            readFile(event) {
                const file = event.target.files[0];
                if (!file || !this.$parent.validateFileSize(file.size)) return;

                const reader = new FileReader();

                reader.onload = (loadEvent) =>
                    this.$emit('set-value', arrayBufferToBase64(loadEvent.target.result));

                reader.readAsArrayBuffer(file);
            },
        },
    };
</script>
