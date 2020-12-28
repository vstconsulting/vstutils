<template>
    <div>
        <template v-if="value && value.content">
            <image_block :field="field" :data="data" :value="value" />
        </template>
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
    </div>
</template>

<script>
    import { BinaryFileFieldContentEdit } from '../binary-file';
    import { NamedBinaryFileFieldContentEdit } from '../named-binary-file';
    import NamedBinaryImageFieldContent from './NamedBinaryImageFieldContent.js';
    import { BinaryFileFieldReadFileButton } from '../binary-file';

    export default {
        components: {
            ReadFileButton: {
                mixins: [BinaryFileFieldReadFileButton],
                data() {
                    return {
                        accept: 'image/*',
                        helpText: 'Open image',
                    };
                },
            },
        },
        mixins: [BinaryFileFieldContentEdit, NamedBinaryFileFieldContentEdit, NamedBinaryImageFieldContent],
    };
</script>

<style></style>
