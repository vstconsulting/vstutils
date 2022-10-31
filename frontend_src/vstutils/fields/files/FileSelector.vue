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
            :title="$tc(helpText)"
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
<script setup>
    import { ref, computed } from 'vue';
    import { useDragAndDrop } from './useDragAndDrop.js';

    const props = defineProps({
        mediaTypes: { type: Array, default: () => ['*'] },
        multiple: { type: Boolean, default: false },
        text: { type: String, default: '' },
        // eslint-disable-next-line vue/require-prop-types
        hasValue: { default: false },
        showHideButton: { type: Boolean, default: false },
    });
    const emit = defineEmits(['read-file', 'clear']);

    const dragZone = ref(null);

    const accept = computed(() => {
        if (Array.isArray(props.mediaTypes)) {
            return props.mediaTypes.join(',');
        }
        return '*/*';
    });
    const helpText = computed(() => {
        if (props.multiple) {
            return 'Select files';
        }
        return 'Select file';
    });

    function changeHandler(e) {
        emit('read-file', e.target.files);
    }

    useDragAndDrop({
        dragZoneRef: dragZone,
        onDragOver: () => dragZone.value.classList.add('is-dragover'),
        onDragLeave: () => dragZone.value.classList.remove('is-dragover'),
        onDragFinished: (e) => emit('read-file', e.dataTransfer.files),
    });
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
