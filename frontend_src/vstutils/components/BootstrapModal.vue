<template>
    <div style="display: contents">
        <slot name="activator" :open-modal="open" :close-modal="close" />
        <portal v-if="isOpen" to="root-bottom">
            <div
                ref="modal"
                v-element-bound="onModalCreated"
                class="modal fade"
                :class="wrapperClasses"
                role="dialog"
            >
                <div class="modal-dialog" :class="classes" role="document">
                    <div class="modal-content">
                        <slot name="content" :close-modal="close">
                            <div class="modal-header">
                                <slot name="header">
                                    <h5 class="modal-title">
                                        {{ title }}
                                    </h5>
                                    <button
                                        type="button"
                                        class="close"
                                        data-dismiss="modal"
                                        aria-label="Close"
                                    >
                                        <span aria-hidden="true">&times;</span>
                                    </button>
                                </slot>
                            </div>
                            <div class="modal-body">
                                <slot name="body" />
                                <slot />
                            </div>
                            <div class="modal-footer">
                                <slot name="footer" />
                            </div>
                        </slot>
                    </div>
                    <div v-if="loading" class="overlay dark">
                        <i class="fas fa-2x fa-spin fa-sync-alt" />
                    </div>
                </div>
            </div>
        </portal>
    </div>
</template>

<script>
    import $ from 'jquery';

    export default {
        name: 'BootstrapModal',
        props: {
            title: { type: String, default: '' },
            wrapperClasses: { type: [Array, String], default: null },
            classes: { type: [Array, String], default: null },
            loading: { type: Boolean, default: false },
        },
        data() {
            return {
                isOpen: false,
            };
        },
        beforeDestroy() {
            if (this.$refs.modal) {
                for (const el of Array.from(document.getElementsByClassName('modal-backdrop'))) el.remove();
                document.body.classList.remove('modal-open');
            }
        },
        methods: {
            onModalCreated(el) {
                $(el)
                    .modal({ show: true })
                    .on('hidden.bs.modal', () => (this.isOpen = false));
            },
            open() {
                this.isOpen = true;
            },
            close() {
                if (this.$refs.modal) {
                    $(this.$refs.modal)
                        .modal('hide')
                        .on('hidden.bs.modal', () => (this.isOpen = false));
                }
                document.body.classList.remove('modal-open');
            },
        },
    };
</script>

<style scoped>
    .modal {
        cursor: auto;
    }
</style>
