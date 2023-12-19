<template>
    <SteppedView v-if="modelDisplayMode === 'STEP'" />
    <DefaultView v-else />
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import { ViewPropsDef } from '@/vstutils/views/props';
    import { type ViewPropsDefType, type DetailView } from '@/vstutils/views';
    import DefaultView from './DefaultView.vue';
    import SteppedView from './tabbed/SteppedView.vue';

    const props = defineProps(ViewPropsDef as ViewPropsDefType<DetailView>);

    const modelDisplayMode = computed(() => props.view.getModel().displayMode);
</script>
