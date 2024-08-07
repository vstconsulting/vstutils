<template>
    <div>
        <ResolutionValidatorModal
            v-if="imagesForValidation"
            :field="field"
            :images="imagesForValidation"
            @cancel="cancelValidation"
            @validated="onImagesValidated"
        />
        <MultipleFilesInput
            :hideable="hideable"
            :clearable="value && value.length > 0"
            :field="field"
            :text="text"
            @input="readFiles"
            @clear="emit('clear')"
            @hide="emit('hide-field')"
        />
        <Carousel
            v-if="value && value.length"
            :items="value"
            :name="$ts(field.title)"
            @remove-file="removeFile"
        />
    </div>
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import { i18n } from '#vstutils/translation';
    import { FieldEditPropsDef } from '#vstutils/fields/base';
    import { ResolutionValidatorModal, useResolutionValidator } from '../named-binary-image';
    import MultipleFilesInput from '../MultipleFilesInput.vue';
    import Carousel from './Carousel.vue';

    import type { ExtractRepresent, FieldEditPropsDefType } from '#vstutils/fields/base';
    import type { NamedFile } from '../named-binary-file';
    import type MultipleNamedBinaryImageField from './MultipleNamedBinaryImageField';

    const props = defineProps(FieldEditPropsDef as FieldEditPropsDefType<MultipleNamedBinaryImageField>);

    const emit = defineEmits<{
        (event: 'set-value', value: ExtractRepresent<MultipleNamedBinaryImageField> | null | undefined): void;
        (event: 'hide-field'): void;
        (event: 'clear'): void;
    }>();

    const text = computed(() => {
        return i18n.tc('image n selected', props.value?.length ?? 0);
    });

    function onImagesValidated(images: NamedFile[]) {
        emit('set-value', [...(props.value ?? []), ...images]);
    }

    function removeFile(index: number) {
        let v = props.value ? [...props.value] : [];
        v.splice(index, 1);
        emit('set-value', v);
    }

    const { imagesForValidation, cancelValidation, readFiles } = useResolutionValidator(
        props.field,
        onImagesValidated,
    );
</script>
