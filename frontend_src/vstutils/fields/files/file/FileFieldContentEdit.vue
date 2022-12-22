<template>
    <div>
        <div class="file-buttons">
            <ClearButton @click.native="clearValue" />
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
            @input="onInput"
        />
    </div>
</template>

<script lang="ts">
    import { defineComponent } from 'vue';
    import { BaseFieldContentEdit } from '@/vstutils/fields/base';
    import FileFieldReadFileButton from './FileFieldReadFileButton.vue';

    export default defineComponent({
        components: {
            ReadFileButton: FileFieldReadFileButton,
        },
        extends: BaseFieldContentEdit,
        emits: ['set-value', 'hide-field'],
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
        methods: {
            onInput(e: Event) {
                this.$emit('set-value', (e.target as HTMLTextAreaElement).value);
            },
        },
    });
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
