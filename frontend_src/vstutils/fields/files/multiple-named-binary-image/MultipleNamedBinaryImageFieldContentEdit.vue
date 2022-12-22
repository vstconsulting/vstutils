<template>
    <div>
        <ResolutionValidatorModal
            v-if="imagesForValidation"
            :field="field"
            :images="imagesForValidation"
            @cancel="cancelValidation"
            @validated="onImagesValidated"
        />
        <FileSelector
            :show-hide-button="hideable"
            :has-value="value && value.length > 0"
            :media-types="field.allowedMediaTypes"
            :text="text"
            multiple
            @read-file="readFiles"
            @clear="emit('clear')"
            @hide="emit('hide-field')"
        />
        <Carousel
            v-if="value && value.length"
            :items="value"
            :name="$t(field.title)"
            @remove-file="removeFile"
        />
    </div>
</template>

<script setup lang="ts">
    import { ResolutionValidatorModal, useResolutionValidator } from '../named-binary-image';
    import Carousel from './Carousel.vue';
    import { computed } from 'vue';
    import { i18n } from '@/vstutils/translation';
    import FileSelector from '../FileSelector.vue';
    import type MultipleNamedBinaryImageField from './MultipleNamedBinaryImageField';
    import type { ExtractRepresent } from '@/vstutils/fields/base';
    import type { NamedFile } from '../named-binary-file';

    const props = defineProps<{
        field: MultipleNamedBinaryImageField;
        value: ExtractRepresent<MultipleNamedBinaryImageField> | null | undefined;
        hideable: boolean;
    }>();

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
