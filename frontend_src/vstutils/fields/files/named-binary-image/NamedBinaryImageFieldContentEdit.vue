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

        <SingleFileInput
            :hideable="hideable"
            :clearable="!!value"
            :field="field"
            :text="name"
            @input="readFiles([$event])"
            @clear="emit('clear')"
            @hide="emit('hide-field')"
        />
    </div>
</template>

<script setup lang="ts">
    import { computed, toRef } from 'vue';
    import { FieldEditPropsDef } from '#vstutils/fields/base';
    import { useNamedFileText } from '../named-binary-file';
    import ImageBlock from './ImageBlock.vue';
    import { useResolutionValidator } from './useResolutionValidator';
    import ResolutionValidatorModal from './ResolutionValidatorModal.vue';
    import SingleFileInput from '../SingleFileInput.vue';

    import type { ExtractRepresent, FieldEditPropsDefType } from '#vstutils/fields/base';
    import type { NamedFile } from '../named-binary-file';
    import type NamedBinaryImageField from './NamedBinaryImageField';

    const props = defineProps(FieldEditPropsDef as FieldEditPropsDefType<NamedBinaryImageField>);

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
