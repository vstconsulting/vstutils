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

    /**
     * Mixin for read file button of binfile field.
     */
    export default {
        mixins: [BaseFieldButton],
        data() {
            return {
                wrapper_classes: ['input-group-append'],
                wrapper_styles: {},
                span_classes: ['btn', 'input-group-text', 'textfile'],
                icon_styles: {},
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
