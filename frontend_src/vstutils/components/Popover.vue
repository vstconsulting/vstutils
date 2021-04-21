<template>
    <a v-if="showPopover" ref="popover" class="popover-symbol" tabindex="0" v-text="linkText" />
</template>

<script>
    import $ from 'jquery';

    /**
     * @see {@link https://getbootstrap.com/docs/4.6/components/popovers/}
     */
    export default {
        name: 'Popover',
        props: {
            title: { type: String, default: '' },
            content: { type: String, default: '' },
            linkText: { type: String, default: '?' },
            customClass: { type: String, default: '' },
        },
        computed: {
            showPopover() {
                return this.title || this.content;
            },
        },
        mounted() {
            if (this.showPopover) {
                $(this.$el).popover({
                    html: true,
                    placement: 'auto',
                    trigger: 'focus',
                    customClass: this.customClass,
                    title: this.title,
                    content: this.content,
                });
            }
        },
        beforeDestroy() {
            if (this.showPopover) {
                $(this.$refs.popover).popover('dispose');
            }
        },
    };
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
