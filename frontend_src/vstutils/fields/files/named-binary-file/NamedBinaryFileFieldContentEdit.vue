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
    import { readFileAsObject } from '../../../utils';

    export default {
        mixins: [BinaryFileFieldContentEdit, NamedBinaryFileFieldContent],
        methods: {
            async readFile(event) {
                const file = event.target.files[0];
                if (!file || !this.$parent.validateFileSize(file.size)) return;
                this.$emit('set-value', await readFileAsObject(file));
            },
        },
    };
</script>

<style scoped></style>
