<template>
    <div>
        <ResolutionValidatorModal
            v-if="imagesForValidation"
            :field="field"
            :images="imagesForValidation"
            @cancel="cancelValidation"
            @validated="onImageValidated"
        />

        <div ref="dragZone" style="transition: all 300ms" class="input-group">
            <p
                class="p-as-input"
                :class="classes"
                :style="styles"
                :aria-labelledby="label_id"
                :aria-label="aria_label"
            >
                {{ val }}
            </p>

            <ReadFileButton :media-types="field.allowedMediaTypes" @read-file="readFiles" />
            <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
            <ClearButton @click.native="clearValue" />
        </div>
        <Carousel
            v-if="value && value.length"
            :items="value"
            :name="$t(field.title)"
            @remove-file="removeFile"
        />
    </div>
</template>

<script>
    import { BinaryFileFieldContentEdit, BinaryFileFieldReadFileButton } from '../binary-file';
    import { ResolutionValidatorMixin, ResolutionValidatorModal } from '../named-binary-image';
    import { MultipleNamedBinaryFileFieldContentEdit } from '../multiple-named-binary-file';
    import MultipleNamedBinaryImageFieldContent from './MultipleNamedBinaryImageFieldContent';
    import Carousel from './Carousel';

    const ReadFileButton = {
        data() {
            return {
                helpText: 'Open images',
                multiple: true,
            };
        },
        mixins: [BinaryFileFieldReadFileButton],
    };

    export default {
        components: { ReadFileButton, ResolutionValidatorModal, Carousel },
        mixins: [
            BinaryFileFieldContentEdit,
            MultipleNamedBinaryImageFieldContent,
            MultipleNamedBinaryFileFieldContentEdit,
            ResolutionValidatorMixin,
        ],
        methods: {
            dragFinished(e) {
                this.readFiles(e.dataTransfer.files);
            },
        },
    };
</script>
