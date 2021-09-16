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

            <ReadFileButton @read-file="readFiles" />
            <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
            <ClearButton @click.native="$emit('set-value', field.getInitialValue())" />
        </div>
        <div>
            <template v-for="(file, idx) in value">
                <MultipleImagesListItem :key="idx" :field="field" :data="data" :file="file">
                    <span class="remove-file cursor-pointer fa fa-times" @click="removeFile(idx)" />
                </MultipleImagesListItem>
            </template>
        </div>
    </div>
</template>

<script>
    import { BinaryFileFieldContentEdit, BinaryFileFieldReadFileButton } from '../binary-file';
    import { ResolutionValidatorMixin, ResolutionValidatorModal } from '../named-binary-image';
    import { MultipleNamedBinaryFileFieldContentEdit } from '../multiple-named-binary-file';
    import MultipleImagesListItem from './MultipleImagesListItem.vue';
    import MultipleNamedBinaryImageFieldContent from './MultipleNamedBinaryImageFieldContent';

    const ReadFileButton = {
        data() {
            return {
                accept: this.$parent.field.allowedMediaTypes?.join(','),
                helpText: 'Open images',
                multiple: true,
            };
        },
        mixins: [BinaryFileFieldReadFileButton],
    };

    export default {
        components: { MultipleImagesListItem, ReadFileButton, ResolutionValidatorModal },
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

<style scoped>
    .remove-file {
        justify-self: center;
    }
</style>
