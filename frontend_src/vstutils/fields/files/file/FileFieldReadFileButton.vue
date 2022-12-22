<template>
    <label :class="wrapperClasses" :style="wrapperStyles" data-toggle="tooltip" :title="$tc(helpText)">
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

<script lang="ts">
    import { defineComponent } from 'vue';
    import FileFieldButtonMixin from './FileFieldButtonMixin';

    /**
     * Component for 'open file' button.
     */
    export default defineComponent({
        extends: FileFieldButtonMixin,
        props: {
            mediaTypes: { type: Array, default: () => ['*'] },
        },
        data() {
            return {
                iconClasses: ['far', 'fa-file-alt'],
                helpText: 'Open file',
                multiple: false,
            };
        },
        computed: {
            accept() {
                if (Array.isArray(this.mediaTypes)) {
                    return this.mediaTypes.join(',');
                }
                return '*/*';
            },
        },
        methods: {
            onChange(event: Event) {
                this.$emit('read-file', event);
            },
        },
    });
</script>
