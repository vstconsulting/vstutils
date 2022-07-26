<template>
    <div>
        <div class="file-buttons">
            <ClearButton @click.native="$emit('set-value', field.getInitialValue())" />
            <ReadFileButton :media-types="field.allowedMediaTypes" @read-file="$parent.readFile($event)" />
            <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
        </div>
        <textarea
            :value="value"
            :placeholder="$u.capitalize($t('enter value'))"
            :class="classes"
            :style="styles"
            :required="attrs['required']"
            :minlength="attrs['minlength']"
            :maxlength="attrs['maxlength']"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
            @input="$emit('set-value', $event.target.value)"
        />
    </div>
</template>

<script>
    import { BaseFieldContentEdit } from '../../base';
    import FileFieldReadFileButton from './FileFieldReadFileButton.vue';

    export default {
        components: {
            ReadFileButton: FileFieldReadFileButton,
        },
        mixins: [BaseFieldContentEdit],
        data() {
            return {
                styles_dict: { resize: 'vertical' },
            };
        },
        computed: {
            selectorText() {
                return this.$u.capitalize(this.$tc('file n selected', this.value ? 1 : 0));
            },
        },
    };
</script>

<style scoped>
    .file-buttons {
        display: flex;
        margin-bottom: 10px;
    }
    .file-buttons > * {
        height: 35px;
    }
</style>
