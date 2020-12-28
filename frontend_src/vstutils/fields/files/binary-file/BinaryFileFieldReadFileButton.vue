<template>
    <div :class="wrapperClasses" :style="wrapperStyles" data-toggle="tooltip" :title="helpText">
        <span :class="spanClasses" :style="spanStyles" @change="$emit('read-file', $event)">
            <input
                id="file_reader_input"
                type="file"
                class="input-file"
                :accept="accept"
                :multiple="multiple"
            />
            <span :class="iconClasses" :style="iconStyles" />
        </span>
    </div>
</template>

<script>
    export default {
        data() {
            return {
                wrapperClasses: ['input-group-append'],
                wrapperStyles: {},
                spanClasses: ['btn', 'input-group-text', 'textfile'],
                spanStyles: {},
                iconClasses: ['far', 'fa-file-alt'],
                iconStyles: {},
                helpText: 'Open file',
                accept: '*',
                multiple: false,
            };
        },
    };
</script>
