<template>
    <div>
        <template v-if="value && value.content">
            <image_block :field="field" :wrapper_opt="wrapper_opt" :data="data" :value="value"></image_block>
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

            <field_read_file_button
                :field="field"
                @readFile="$emit('proxyEvent', 'readFile', $event)"
            ></field_read_file_button>

            <field_hidden_button
                v-if="with_hidden_button"
                :field="field"
                @hideField="$emit('proxyEvent', 'hideField')"
            ></field_hidden_button>

            <field_clear_button
                :field="field"
                @cleanValue="$emit('proxyEvent', 'cleanValue')"
            ></field_clear_button>
        </div>
    </div>
</template>

<script>
    import { BinaryFileFieldContentEdit } from '../binary-file';
    import { NamedBinaryFileFieldContent } from '../named-binary-file';
    import NamedBinaryImageFieldContent from './NamedBinaryImageFieldContent.js';
    import { BinaryFileFieldReadFileButton } from '../binary-file';

    export default {
        mixins: [BinaryFileFieldContentEdit, NamedBinaryFileFieldContent, NamedBinaryImageFieldContent],
        components: {
            field_read_file_button: {
                mixins: [BinaryFileFieldReadFileButton],
                data() {
                    return {
                        accept: 'image/*',
                        help_text: 'Open image',
                    };
                },
            },
        },
    };
</script>

<style></style>
