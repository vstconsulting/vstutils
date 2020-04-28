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

<style scoped>
    .modal-mask {
        color: #333;
        position: fixed;
        z-index: 1110;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: table;
        transition: opacity 0.3s ease;
    }
    .modal-wrapper {
        display: table-cell;
        vertical-align: middle;
    }

    .modal-container {
        max-width: 600px;
        margin: 0px auto;
        padding: 0;
        background-color: var(--modal-bg-color);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
        transition: all 0.3s ease;
        overflow-y: auto;
        max-height: 100vh;
    }

    .modal-header {
        background-color: var(--card-header-bg-color);
        border-top-left-radius: 0;
        border-top-right-radius: 0;
    }

    .modal-header h3 {
        margin-top: 0;
        color: #fff;
    }

    .modal-body {
        margin: 0;
    }

    .btn-modal-header-close {
        cursor: pointer;
        color: #fefefe;
        opacity: 0.3;
        margin-top: 5px;
    }

    .btn-modal-header-close:hover {
        opacity: 1;
    }

    .modal-default-button {
        float: right;
    }

    .modal-enter {
        opacity: 0;
    }

    .modal-leave-active {
        opacity: 0;
    }

    .modal-enter .modal-container,
    .modal-leave-active .modal-container {
        transform: scale(1.1);
    }

    .modal .btn-default.btn-primary {
        color: #fff;
        background-color: #007bff;
        border-color: #007bff;
        box-shadow: 0 1px 1px rgba(0, 0, 0, 0.075);
    }

    .modal .btn-default.btn-primary:hover {
        color: #fff;
        background-color: #0069d9;
        border-color: #0062cc;
    }
</style>
