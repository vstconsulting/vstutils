<template>
    <transition name="modal">
        <div class="modal-mask">
            <div class="modal-wrapper">
                <div class="modal-container">
                    <div class="modal-header text-data" v-if="with_header">
                        <slot name="header">
                            default header
                        </slot>
                        <span @click="close" class="btn-modal-header-close">
                            <i class="fa fa-times"></i>
                        </span>
                    </div>

                    <div class="modal-body text-data">
                        <slot name="body"></slot>
                    </div>

                    <div class="modal-footer text-data" v-if="with_footer">
                        <slot name="footer">
                            default footer
                            <button class="modal-default-button" @click="$emit('close')" aria-label="OK">
                                OK
                            </button>
                        </slot>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script>
    export default {
        name: 'gui_modal',
        props: ['opt'],
        /**
         * Adds event callback for keyup.
         */
        mounted() {
            window.addEventListener('keyup', this.escHandler);
        },
        /**
         * Removes event callback for keyup.
         */
        beforeDestroy() {
            window.removeEventListener('keyup', this.escHandler);
        },
        computed: {
            with_header() {
                if (this.opt && this.opt.header == false) {
                    return false;
                }

                return true;
            },
            with_footer() {
                if (this.opt && this.opt.footer == false) {
                    return false;
                }

                return true;
            },
        },
        methods: {
            close() {
                this.$emit('close');
            },
            /**
             * Handler for 'escape' keyup event.
             */
            escHandler(e) {
                if (e.code == 'Escape') {
                    this.close();
                }
            },
        },
    };
</script>

<style scoped></style>
