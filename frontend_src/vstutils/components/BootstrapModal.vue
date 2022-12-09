<template>
    <div style="display: contents">
        <slot name="activator" :open-modal="open" :close-modal="close" />
        <portal v-if="isOpen" to="root-bottom">
            <div
                ref="modal"
                v-element-bound="onModalCreated"
                class="modal fade"
                :class="wrapperClasses"
                tabindex="-1"
                role="dialog"
                @click.stop
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
                                <slot :open-modal="open" :close-modal="close" />
                            </div>
                            <div v-show="$slots.footer" class="modal-footer">
                                <slot name="footer" />
                            </div>
                        </slot>
                    </div>
                    <OverlayLoader v-if="loading" />
                </div>
            </div>
        </portal>
    </div>
</template>

<script>
    import $ from 'jquery';
    import OverlayLoader from '@/vstutils/components/OverlayLoader.vue';

    export default {
        name: 'BootstrapModal',
        components: { OverlayLoader },
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
            callCloseCallback() {
                this.isOpen = false;
                this.$emit('exit');
            },
            onModalCreated(el) {
                $(el)
                    .modal({ show: true })
                    .on('hide.bs.modal', () => {
                        this.callCloseCallback();
                    })
                    .on('shown.bs.modal', () => {
                        this.$emit('shown');
                    });
            },
            open() {
                this.isOpen = true;
            },
            close() {
                if (this.$refs.modal) {
                    $(this.$refs.modal)
                        .modal('hide')
                        .on('hide.bs.modal', () => {
                            this.callCloseCallback();
                        });
                }
                document.body.classList.remove('modal-open');
            },
        },
    };
</script>

<style scoped>
    .modal {
        cursor: auto;
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
    }
</style>
