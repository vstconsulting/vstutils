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
</template>

<script>
    import { BinaryFileFieldContentEdit } from '../binary-file';
    import NamedBinaryFileFieldContent from './NamedBinaryFileFieldContent.js';

    export default {
        mixins: [BinaryFileFieldContentEdit, NamedBinaryFileFieldContent],
    };
</script>

<style scoped></style>
