<template>
    <div>
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

            <ReadFileButton :media-types="field.allowedMediaTypes" @read-file="$parent.readFile($event)" />
            <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
            <ClearButton @click.native="clearValue" />
        </div>
        <div>
            <ul class="multiple-files-list">
                <template v-for="(file, idx) in value">
                    <li :key="idx">
                        <div>
                            <span
                                title="Download file"
                                class="cursor-pointer break-word"
                                @click="fileClickHandler(file)"
                                v-text="file.name"
                            />
                            <span class="cursor-pointer fa fa-times" @click="removeFile(idx)" />
                        </div>
                    </li>
                </template>
            </ul>
        </div>
    </div>
</template>

<script>
    import { BinaryFileFieldReadFileButton, BinaryFileFieldContentEdit } from '../binary-file';
    import MultipleNamedBinaryFileFieldContent from './MultipleNamedBinaryFileFieldContent';
    import { downloadBase64File } from '../../../utils';

    /**
     * Mixin for editable multiplenamedbinfile field.
     */
    export default {
        components: {
            ReadFileButton: {
                mixins: [BinaryFileFieldReadFileButton],
                data() {
                    return {
                        helpText: 'Open files',
                        multiple: true,
                    };
                },
            },
        },
        mixins: [BinaryFileFieldContentEdit, MultipleNamedBinaryFileFieldContent],
        methods: {
            fileClickHandler(file) {
                downloadBase64File(file);
            },
            removeFile(index) {
                let v = this.value ? [...this.value] : [];
                v.splice(index, 1);
                this.$emit('set-value', v);
            },
            dragFinished(e) {
                this.$parent.readFile(e.dataTransfer.files);
            },
        },
    };
</script>
