<template>
    <BootstrapModal ref="modal" :title="$t(title)" @exit="closeCallback">
        <template #body>
            <div>
                <p>
                    {{ $t(message) }}
                </p>
            </div>
        </template>
        <template #footer>
            <button class="btn btn-success" @click="callConfirm">
                {{ $t(confirmTitle) }}
            </button>
            <button class="btn btn-secondary" style="float: right" @click="callReject">
                {{ $t(rejectTitle) }}
            </button>
        </template>
    </BootstrapModal>
</template>

<script>
    import BootstrapModal from '../BootstrapModal';

    export default {
        name: 'ConfirmModal',
        components: { BootstrapModal },
        props: {
            title: { type: String, default: 'Confirm action' },
            message: { type: String, default: '' },
            confirmTitle: { type: String, default: 'Yes' },
            rejectTitle: { type: String, default: 'No' },
        },
        data() {
            return {
                isActioned: false,
            };
        },
        methods: {
            callConfirm() {
                this.isActioned = true;
                this.$emit('confirm');
            },
            callReject() {
                this.isActioned = true;
                this.$emit('reject');
            },
            closeCallback() {
                if (!this.isActioned) {
                    this.callReject();
                }
            },
            closeModal() {
                if (this.$refs.modal.isOpen) {
                    this.$refs.modal.close();
                }
            },
            openModal() {
                this.isActioned = false;
                if (!this.$refs.modal.isOpen) {
                    this.$refs.modal.open();
                }
            },
        },
    };
</script>
