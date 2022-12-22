<template>
    <div>
        <div>
            {{ text }}
        </div>
        <Carousel v-if="value && value.length" :items="value" :name="$t(field.title)" readonly />
    </div>
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import { i18n } from '@/vstutils/translation';
    import Carousel from './Carousel.vue';

    import type { ExtractRepresent } from '@/vstutils/fields/base';
    import type MultipleNamedBinaryImageField from './MultipleNamedBinaryImageField';

    const props = defineProps<{
        field: MultipleNamedBinaryImageField;
        value: ExtractRepresent<MultipleNamedBinaryImageField> | null | undefined;
    }>();

    const text = computed(() => {
        return i18n.tc('image n selected', props.value?.length ?? 0);
    });
</script>
