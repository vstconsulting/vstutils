<template>
    <div>
        <FileInputButton style="margin-bottom: 0.5rem" :accept="accept" @input.native="handleFileInput" />
        <FieldTextarea :value="value || ''" :field="field" @input="$emit('set-value', $event)" />
    </div>
</template>

<script lang="ts">
    import { computed, defineComponent } from 'vue';
    import {
        FieldEditPropsDef,
        FieldEditEmitsDef,
        type FieldEditEmitsDefType,
        type FieldEditPropsDefType,
    } from '@/vstutils/fields/base';
    import FileInputButton from '@/vstutils/components/FileInputButton.vue';
    import FieldTextarea from './FieldTextarea.vue';
    import type { TextAreaField } from './TextAreaField';
    import type { IFileField } from '../files/file/utils';

    export default defineComponent({
        components: {
            FieldTextarea,
            FileInputButton,
        },
        props: FieldEditPropsDef as FieldEditPropsDefType<TextAreaField>,
        emits: FieldEditEmitsDef as FieldEditEmitsDefType<TextAreaField>,
        setup(props, { emit }) {
            const accept = computed(() => {
                if ('allowedMediaTypes' in props.field) {
                    const field = props.field as IFileField;
                    return field.allowedMediaTypes?.join(',');
                }
                return undefined;
            });

            async function handleFileInput(e: Event) {
                const input = e.target as HTMLInputElement;
                const file = (input.files ?? [])[0];
                if (file) {
                    const text = await file.text();
                    emit('set-value', text);
                    input.value = '';
                }
            }

            return { accept, handleFileInput };
        },
    });
</script>
