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
                            <div v-show="$scopedSlots.footer" class="modal-footer">
                                <slot name="footer" :close-modal="close" />
                            </div>
                        </slot>
                    </div>
                    <OverlayLoader v-if="loading" />
                </div>
            </div>
        </portal>
    </div>
</template>

<script lang="ts">
    import $ from 'jquery';
    import { defineComponent } from 'vue';
    import OverlayLoader from '@/vstutils/components/OverlayLoader.vue';

    // When at least one modal window is open we ensure that 'modal-open' css class is applied to body
    const [onModalOpened, onModalClosed] = (() => {
        let counter = 0;
        const className = 'modal-open';
        const el = document.body;
        function check() {
            if (counter <= 0) {
                el.classList.remove(className);
                for (const backdrop of document.querySelectorAll('body > .modal-backdrop')) {
                    backdrop.remove();
                }
            } else if (counter > 0) {
                el.classList.add(className);
            }
        }
        return [
            function onModalOpened() {
                counter++;
                check();
            },
            function onModalClosed() {
                counter--;
                check();
            },
        ];
    })();

    export default defineComponent({
        name: 'BootstrapModal',
        components: { OverlayLoader },
        props: {
            title: { type: String, default: '' },
            wrapperClasses: { type: [Array, String], default: null },
            classes: { type: [Array, String], default: null },
            loading: { type: Boolean, default: false },
        },
        emits: ['shown', 'exit'],
        data() {
            return {
                isOpen: false,
            };
        },
        beforeDestroy() {
            if (this.isOpen) {
                this.close();
            }
        },
        methods: {
            onModalCreated(el: HTMLElement) {
                $(el)
                    .modal({ show: true })
                    .on('hidden.bs.modal', () => {
                        this.isOpen = false;
                        this.$emit('exit');
                        onModalClosed();
                    })
                    .on('shown.bs.modal', () => {
                        this.$emit('shown');
                        onModalOpened();
                    });
            },
            open() {
                this.isOpen = true;
            },
            close() {
                if (this.$refs.modal) {
                    $(this.$refs.modal).modal('hide');
                }
            },
        },
    });
</script>

<style scoped>
    .modal {
        cursor: auto;
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
    }
</style>
