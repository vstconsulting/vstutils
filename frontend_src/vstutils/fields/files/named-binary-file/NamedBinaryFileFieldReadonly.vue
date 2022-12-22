<template>
    <a v-if="link" :href="link" :download="fileName">{{ text }}</a>
</template>

<script setup lang="ts">
    import { computed, toRef } from 'vue';
    import { makeDataImageUrl } from '@/vstutils/utils';
    import type { ExtractRepresent } from '@/vstutils/fields/base';
    import type NamedBinaryFileField from './NamedBinaryFileField';
    import { useNamedFileText } from './utils';

    const props = defineProps<{
        field: NamedBinaryFileField;
        value: ExtractRepresent<NamedBinaryFileField> | null | undefined;
    }>();

    const link = computed(() => {
        if (props.value?.content) {
            return makeDataImageUrl(props.value);
        }
        return undefined;
    });

    const fileName = computed(() => {
        if (props.value?.name) {
            return props.value.name;
        }
        return props.field.name;
    });

    const text = useNamedFileText(toRef(props, 'value'));
</script>
