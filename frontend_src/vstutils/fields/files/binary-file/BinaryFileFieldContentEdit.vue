<template>
    <div class="input-group">
        <p
            id="file_path_input"
            class="p-as-input"
            :class="classes"
            :style="styles"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
        ></p>

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
    import { BaseFieldContentEdit, BaseFieldButton } from '../../base';
    import BinaryFileFieldReadFileButton from './BinaryFileFieldReadFileButton.vue';

    /**
     * Mixin for editable binfile field (input value area).
     */
    export default {
        mixins: [BaseFieldContentEdit],
        created() {
            this.styles_dict.minHeight = '38px';
        },
        components: {
            field_clear_button: BaseFieldButton,
            field_hidden_button: {
                mixins: [BaseFieldButton],
                data() {
                    return {
                        icon_classes: ['fa', 'fa-minus'],
                        event_handler: 'hideField',
                        help_text: 'Hide field',
                    };
                },
            },
            /**
             * Component for 'open file' button.
             */
            field_read_file_button: BinaryFileFieldReadFileButton,
        },
    };
</script>

<style scoped></style>
