<template>
    <label :class="wrapperClasses" :style="wrapperStyles" data-toggle="tooltip" :title="$t(helpText)">
        <span :class="spanClasses" :style="spanStyles" @change="onChange">
            <input
                type="file"
                class="input-file"
                :accept="accept"
                :multiple="multiple"
                style="pointer-events: none"
            />
            <span :class="iconClasses" :style="iconStyles" />
        </span>
    </label>
</template>

<script>
    import FileFieldButtonMixin from './FileFieldButtonMixin.js';
    import { BaseFieldButton } from '../../buttons';

    /**
     * Component for 'open file' button.
     */
    export default {
        mixins: [BaseFieldButton, FileFieldButtonMixin],
        data() {
            return {
                iconClasses: ['far', 'fa-file-alt'],
                helpText: 'Open file',
                accept: '*',
                multiple: false,
            };
        },
        methods: {
            onChange(event) {
                this.$emit('read-file', event);
            },
        },
    };
</script>
