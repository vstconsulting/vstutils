<template>
    <div style="display: contents">
        <slot name="activator" :openModal="open" :closeModal="close" />
        <portal v-if="isOpen" to="root-bottom">
            <div
                ref="modal"
                v-element-bound="onModalCreated"
                class="modal fade"
                :class="wrapperClasses"
                tabindex="-1"
                role="dialog"
            >
                <div class="modal-dialog" :class="classes" role="document">
                    <div class="modal-content">
                        <slot name="content" :closeModal="close" />
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
            wrapperClasses: { type: [Array, String], required: false, default: null },
            classes: { type: [Array, String], required: false, default: null },
        },
        data: () => ({ isOpen: false }),
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
