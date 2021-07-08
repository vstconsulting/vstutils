<template>
    <div>
        <image_block v-if="showPreview" :field="field" :data="data" :value="value" />
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

            <ReadFileButton :extensions="field.extensions" @read-file="readFiles" />
            <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
            <ClearButton @click.native="$emit('set-value', field.getInitialValue())" />
        </div>
    </div>
</template>

<script>
    import { BinaryFileFieldContentEdit, BinaryFileFieldReadFileButton } from '../binary-file';
    import { NamedBinaryFileFieldContentEdit } from '../named-binary-file';
    import NamedBinaryImageFieldContent from './NamedBinaryImageFieldContent.js';
    import ResolutionValidatorModal from './ResolutionValidatorModal.vue';
    import ResolutionValidatorMixin from './ResolutionValidatorMixin.js';

    const ReadFileButton = {
        data() {
            return {
                accept: this.$parent.field.extensions || 'image/*',
                helpText: 'Open image',
            };
        },
        mixins: [BinaryFileFieldReadFileButton],
    };

    export default {
        components: { ResolutionValidatorModal, ReadFileButton },
        mixins: [
            BinaryFileFieldContentEdit,
            NamedBinaryFileFieldContentEdit,
            NamedBinaryImageFieldContent,
            ResolutionValidatorMixin,
        ],
        computed: {
            showPreview() {
                return this.value?.content;
            },
        },
        methods: {
            onImageValidated([validatedImage]) {
                this.$emit('set-value', validatedImage);
                this.cancelValidation();
            },
            dragFinished(e) {
                this.readFiles(e.dataTransfer.files);
            },
        },
    };
</script>
