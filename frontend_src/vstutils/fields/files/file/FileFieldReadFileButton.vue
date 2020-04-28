<template>
    <div :class="wrapper_classes" :style="wrapper_styles" data-toggle="tooltip" :title="help_text">
        <span :class="span_classes" :style="span_styles" @change="eventHandler">
            <input
                type="file"
                class="input-file"
                id="file_reader_input"
                :accept="accept"
                :multiple="multiple"
            />
            <span :class="icon_classes" :style="icon_styles"></span>
        </span>
    </div>
</template>

<script>
    import { BaseFieldButton } from '../../base';
    import FileFieldButtonMixin from './FileFieldButtonMixin.js';

    /**
     * Component for 'open file' button.
     */
    export default {
        mixins: [BaseFieldButton, FileFieldButtonMixin],
        data() {
            return {
                icon_classes: ['far', 'fa-file-alt'],
                event_handler: 'readFile',
                help_text: 'Open file',
                accept: '*',
                multiple: false,
            };
        },
    };
</script>

<style scoped></style>
