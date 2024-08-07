<template>
    <TabbedDetail :instance="instance" :type="type" />
</template>

<script setup lang="ts">
    import { useViewStore } from '#vstutils/store';
    import { ViewTypes } from '#vstutils/utils';
    import { type DetailView } from '#vstutils/views';
    import { computed } from 'vue';
    import TabbedDetail from './TabbedDetail.vue';

    const store = useViewStore<DetailView>();

    const view = computed(() => store.view);
    const instance = computed(() => store.instance!);

    const type = computed(() => {
        switch (view.value.type) {
            case ViewTypes.PAGE:
                return 'readonly';
            case ViewTypes.PAGE_NEW:
                return 'create';
            case ViewTypes.ACTION:
                return 'create';
            default:
                return 'edit';
        }
    });
</script>
