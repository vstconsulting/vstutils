<template>
    <div>
        <div class="input-group">
            <p
                class="p-as-input"
                :class="classes"
                :style="styles"
                :aria-labelledby="label_id"
                :aria-label="aria_label"
            >
                {{ val }}
            </p>

            <ReadFileButton @read-file="$parent.readFile($event)" />
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
    import { MultipleNamedBinaryFileFieldContentEdit } from '../multiple-named-binary-file';
    import MultipleImagesListItem from './MultipleImagesListItem.vue';
    import MultipleNamedBinaryImageFieldContent from './MultipleNamedBinaryImageFieldContent';

    export default {
        components: {
            MultipleImagesListItem,
            ReadFileButton: {
                mixins: [BinaryFileFieldReadFileButton],
                data() {
                    return {
                        accept: 'image/*',
                        helpText: 'Open images',
                        multiple: true,
                    };
                },
            },
        },
        mixins: [
            BinaryFileFieldContentEdit,
            MultipleNamedBinaryImageFieldContent,
            MultipleNamedBinaryFileFieldContentEdit,
        ],
    };
</script>

<style scoped>
    .remove-file {
        justify-self: center;
    }
</style>
