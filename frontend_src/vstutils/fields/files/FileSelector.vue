<template>
    <div ref="dragZone" class="file-selector" style="transition: all 300ms">
        <button
            v-if="showHideButton"
            class="btn btn-secondary"
            :title="$t('Hide field')"
            @click="$emit('hide')"
        >
            <i class="fa fa-minus" />
        </button>
        <button v-if="hasValue" class="btn btn-secondary" :title="$t('Clear field')" @click="$emit('clear')">
            <i class="fa fa-times" />
        </button>
        <label
            v-else
            class="btn btn-secondary"
            style="margin-bottom: 0"
            :title="helpText"
            @change="changeHandler"
        >
            <input
                type="file"
                class="input-file"
                :accept="accept"
                :multiple="multiple"
                style="pointer-events: none"
            />
            <span class="far fa-file-alt" />
        </label>
        <span>{{ text }}</span>
    </div>
</template>
<script>
    import DragAndDropMixin from './DragAndDropMixin.js';
    export default {
        mixins: [DragAndDropMixin],
        props: {
            mediaTypes: { type: Array, default: () => ['*'] },
            multiple: { type: Boolean, default: false },
            text: { type: String, default: '' },
            // eslint-disable-next-line vue/require-prop-types
            hasValue: { default: false },
            showHideButton: { type: Boolean, default: false },
        },
        computed: {
            accept() {
                if (Array.isArray(this.mediaTypes)) {
                    return this.mediaTypes.join(',');
                }
                return '*/*';
            },
            helpText() {
                if (this.multiple) {
                    return this.$t('Select files');
                }
                return this.$t('Select file');
            },
        },
        methods: {
            changeHandler(e) {
                this.$emit('read-file', e.target.files);
            },
            dragOver() {
                this.$refs.dragZone.classList.add('is-dragover');
            },
            dragLeave() {
                this.$refs.dragZone.classList.remove('is-dragover');
            },
            dragFinished(e) {
                this.$emit('read-file', e.dataTransfer.files);
                console.log(arguments, e.dataTransfer, e.dataTransfer.files);
            },
        },
    };
</script>

<style scoped>
    .is-dragover {
        box-shadow: 0 0 0 0.2rem #007bff40;
        border-radius: 0.25rem;
    }
    .input-file {
        position: absolute;
        top: 0px;
        left: 0px;
        width: 100%;
        height: 100%;
        z-index: 1;
        opacity: 0;
        cursor: pointer;
        overflow: hidden;
    }

    .file-selector > * + * {
        margin-left: 0.3rem;
    }
</style>
