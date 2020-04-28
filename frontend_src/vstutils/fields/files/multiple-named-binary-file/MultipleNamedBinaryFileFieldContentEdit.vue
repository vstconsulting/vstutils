<template>
    <div>
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
        <div>
            <ul class="multiple-files-list">
                <template v-for="(file, idx) in value">
                    <li :key="idx">
                        <div>
                            <span class="break-word">{{ file.name }}</span>
                            <span class="cursor-pointer fa fa-times" @click="removeFile(index)"></span>
                        </div>
                    </li>
                </template>
            </ul>
        </div>
    </div>
</template>

<script>
    import { BinaryFileFieldReadFileButton, BinaryFileFieldContentEdit } from '../binary-file';
    import MultipleNamedBinaryFileFieldContent from './MultipleNamedBinaryFileFieldContent';

    /**
     * Mixin for editable multiplenamedbinfile field.
     */
    export default {
        mixins: [BinaryFileFieldContentEdit, MultipleNamedBinaryFileFieldContent],
        methods: {
            removeFile(index) {
                let v = this.value ? [...this.value] : [];
                v.splice(index, 1);
                this.$emit('proxyEvent', 'setValueInStore', v);
            },
        },
        components: {
            field_read_file_button: {
                mixins: [BinaryFileFieldReadFileButton],
                data() {
                    return {
                        help_text: 'Open files',
                        multiple: true,
                    };
                },
            },
        },
    };
</script>

<style scoped></style>
