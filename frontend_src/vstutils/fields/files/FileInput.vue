<template>
    <div ref="dragZone" class="file-input input-group" :class="{ 'is-dragover': isDragOver }">
        <div class="form-control file-selector-text">{{ text }}</div>
        <input
            :id="inputId"
            type="file"
            :accept="fileTypesStr"
            :multiple="multiple"
            :disabled="disabled"
            class="hidden-input"
            @input="handleInput"
        />
        <div class="input-group-append">
            <label :for="inputId" :title="helpText" :disabled="disabled" class="btn input-group-text">
                <i aria-hidden="true" class="far fa-file-alt" />
                <span class="sr-only">{{ helpText }}</span>
            </label>
            <slot name="append" />
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { i18n } from '#vstutils/translation';
    import { getUniqueId } from '#vstutils/utils';
    import { useDragAndDrop } from './useDragAndDrop';

    const props = withDefaults(
        defineProps<{
            multiple?: boolean;
            text?: string;
            fileTypes?: string[];
            disabled?: boolean;
        }>(),
        {
            fileTypes: () => ['*/*'],
        },
    );
    const emit = defineEmits<{
        (e: 'input', files: File[]): void;
    }>();

    const inputId = `file-selector-${getUniqueId()}`;
    const isDragOver = ref(false);
    const dragZone = ref<HTMLElement | null>(null);

    const fileTypesStr = computed(() => {
        return props.fileTypes.join(',');
    });

    const helpText = computed(() => {
        if (props.multiple) {
            return i18n.ts('Select files');
        }
        return i18n.ts('Select file');
    });

    function handleInput(event: Event) {
        const input = event.target as HTMLInputElement;
        emit('input', Array.from(input.files!));
        input.value = '';
    }

    useDragAndDrop({
        dragZoneRef: dragZone,
        onDragOver: () => (isDragOver.value = true),
        onDragLeave: () => (isDragOver.value = false),
        onDragFinished: (e: DragEvent) => emit('input', Array.from(e.dataTransfer!.files)),
    });
</script>

<style scoped>
    .file-selector-text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .file-input {
        transition: box-shadow 0.3s ease-in-out, border-radius 0.3s ease-in-out;
    }
    .hidden-input {
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
    .is-dragover {
        box-shadow: 0 0 0 0.2rem #007bff40;
        border-radius: 0.25rem;
    }
</style>
