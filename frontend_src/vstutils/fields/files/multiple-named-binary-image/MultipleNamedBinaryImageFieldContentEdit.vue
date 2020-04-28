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

            <field_read_file_button
                :field="field"
                @readFile="$emit('proxyEvent', 'readFile', $event)"
            ></field_read_file_button>

            <field_hidden_button
                v-if="with_hidden_button"
                :field="field"
                @hideField="$emit('proxyEvent', 'hideField')"
            ></field_hidden_button>

            <field_clear_button
                :field="field"
                @cleanValue="$emit('proxyEvent', 'cleanValue')"
            ></field_clear_button>
        </div>
        <div>
            <template v-for="(file, idx) in value">
                <MultipleImagesListItem
                    :key="idx"
                    :field="field"
                    :wrapper_opt="wrapper_opt"
                    :data="data"
                    :value="file"
                >
                    <span class="remove-file cursor-pointer fa fa-times" @click="removeFile(idx)"></span>
                </MultipleImagesListItem>
            </template>
        </div>
    </div>
</template>

<script>
    import { BinaryFileFieldContentEdit, BinaryFileFieldReadFileButton } from '../binary-file';
    import MultipleNamedBinaryImageFieldContentReadonly from './MultipleNamedBinaryImageFieldContentReadonly.vue';
    import { MultipleNamedBinaryFileFieldContentEdit } from '../multiple-named-binary-file';
    import MultipleImagesListItem from './MultipleImagesListItem.vue';

    export default {
        mixins: [
            BinaryFileFieldContentEdit,
            MultipleNamedBinaryImageFieldContentReadonly,
            MultipleNamedBinaryFileFieldContentEdit,
        ],
        components: {
            MultipleImagesListItem: MultipleImagesListItem,
            field_read_file_button: {
                mixins: [BinaryFileFieldReadFileButton],
                data() {
                    return {
                        accept: 'image/*',
                        help_text: 'Open images',
                        multiple: true,
                    };
                },
            },
        },
    };
</script>

<style scoped>
    .remove-file {
        justify-self: center;
    }
</style>
