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

        <ReadFileButton @read-file="$emit('set-value', $event)" />
        <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
        <ClearButton @click.native="$emit('set-value', field.getInitialValue())" />
    </div>
</template>

<script>
    import { BaseFieldContentEdit } from '../../base';
    import BinaryFileFieldReadFileButton from './BinaryFileFieldReadFileButton.vue';

    export default {
        components: {
            /**
             * Component for 'open file' button.
             */
            ReadFileButton: BinaryFileFieldReadFileButton,
        },
        mixins: [BaseFieldContentEdit],
        created() {
            this.styles_dict.minHeight = '38px';
        },
    };
</script>
