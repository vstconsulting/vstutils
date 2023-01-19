<template>
    <div>
        <ImageBlock
            v-if="showPreview"
            :field="field"
            :value="value"
            :preview-style="{ marginBottom: '1rem' }"
        />
        <ResolutionValidatorModal
            v-if="imagesForValidation"
            :field="field"
            :images="imagesForValidation"
            @cancel="cancelValidation"
            @validated="onImageValidated"
        />

        <FileSelector
            :show-hide-button="hideable"
            :has-value="!!value"
            :media-types="field.allowedMediaTypes"
            :text="name"
            @read-file="readFiles"
            @clear="emit('clear')"
            @hide="emit('hide-field')"
        />
    </div>
</template>

<script setup lang="ts">
    import type { ExtractRepresent } from '@/vstutils/fields/base';
    import { computed, toRef } from 'vue';
    import type { NamedFile } from '../named-binary-file';
    import { useNamedFileText } from '../named-binary-file';
    import ImageBlock from './ImageBlock.vue';
    import type NamedBinaryImageField from './NamedBinaryImageField';
    import { useResolutionValidator } from './useResolutionValidator';
    import ResolutionValidatorModal from './ResolutionValidatorModal.vue';
    import FileSelector from '../FileSelector.vue';

    const props = defineProps<{
        field: NamedBinaryImageField;
        value: ExtractRepresent<NamedBinaryImageField> | null | undefined;
        hideable: boolean;
    }>();

    const emit = defineEmits<{
        (event: 'set-value', value: ExtractRepresent<NamedBinaryImageField> | null | undefined): void;
        (event: 'hide-field'): void;
        (event: 'clear'): void;
    }>();

    const showPreview = computed(() => props.value?.content);

    function onImageValidated(images: NamedFile[]) {
        if (images.length > 0) {
            emit('set-value', images[0]);
        } else {
            emit('set-value', null);
        }
    }

    const name = useNamedFileText(toRef(props, 'value'));

    const { imagesForValidation, cancelValidation, readFiles } = useResolutionValidator(
        props.field,
        onImageValidated,
    );
</script>
