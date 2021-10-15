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
        data() {
            return {
                popoverCreated: false,
            };
        },
        computed: {
            showPopover() {
                return this.title || this.content;
            },
        },
        watch: {
            showPopover: 'initPopover',
        },
        mounted() {
            this.initPopover();
        },
        beforeDestroy() {
            this.destroyPopover();
        },
        methods: {
            initPopover() {
                this.destroyPopover();
                if (this.showPopover) {
                    $(this.$el).popover({
                        html: true,
                        placement: 'auto',
                        trigger: 'focus',
                        customClass: this.customClass,
                        title: this.title,
                        content: this.content,
                    });
                    this.popoverCreated = true;
                }
            },
            destroyPopover() {
                if (this.popoverCreated) {
                    $(this.$refs.popover).popover('dispose');
                }
            },
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
