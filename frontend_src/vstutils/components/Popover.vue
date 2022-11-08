<template>
    <a v-if="showPopover" ref="popover" class="popover-symbol" tabindex="0" v-text="linkText" />
</template>

<script setup lang="ts">
    /**
     * @see {@link https://getbootstrap.com/docs/4.6/components/popovers/}
     */
    import $ from 'jquery';
    import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

    const props = defineProps({
        title: { type: String, default: '' },
        content: { type: String, default: '' },
        linkText: { type: String, default: '?' },
        customClass: { type: String, default: '' },
    });
    const showPopover = computed(() => props.title || props.content);
    const popover = ref<HTMLElement | null>(null);
    let popoverCreated = false;

    function destroyPopover() {
        if (popoverCreated && popover.value) {
            $(popover.value).popover('dispose');
        }
    }

    function initPopover() {
        destroyPopover();
        if (showPopover.value && popover.value) {
            $(popover.value).popover({
                html: true,
                placement: 'auto',
                trigger: 'focus',
                customClass: props.customClass,
                title: props.title,
                content: props.content,
            });
            popoverCreated = true;
        }
    }
    watch(showPopover, initPopover);
    onMounted(initPopover);
    onBeforeUnmount(destroyPopover);
</script>

<style scoped>
    .popover-symbol {
        color: var(--info);
        display: inline-block;
        width: 1em;
        text-align: center;
        cursor: pointer;
        outline: none;
    }
</style>
