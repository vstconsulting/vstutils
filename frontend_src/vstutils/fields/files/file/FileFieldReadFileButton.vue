<template>
    <div :class="wrapperClasses" :style="wrapperStyles" data-toggle="tooltip" :title="helpText">
        <span :class="spanClasses" :style="spanStyles" @change="$emit('read-file', $event)">
            <input type="file" class="input-file" :accept="accept" :multiple="multiple" />
            <span :class="iconClasses" :style="iconStyles" />
        </span>
    </div>
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
    };
</script>
