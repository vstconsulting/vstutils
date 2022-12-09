<template>
    <BootstrapModal ref="modal" :title="$t('Select an action for this instances')">
        <template #body>
            <div class="my-2 d-flex justify-content-center align-items-center">
                <ul class="list-group list-group-flush">
                    <li v-for="instance in instances" :key="instance.getPkValue()" class="list-group-item">
                        {{ instance.getViewFieldValue() }}
                    </li>
                </ul>
            </div>
        </template>
        <template #footer>
            <button class="btn btn-primary" aria-label="Cancel" @click="performDeletion(false)">
                {{ $t('Remove from list') }}
            </button>
            <button class="btn btn-danger" aria-label="Cancel" @click="performDeletion(true)">
                {{ $t('Purge') }}
            </button>
        </template>

        <template #activator>
            <slot :execute="execute" />
        </template>
    </BootstrapModal>
</template>

<script>
    import BootstrapModal from '../BootstrapModal.vue';
    import { ViewTypes } from '../../utils';
    export default {
        name: 'NestedDeletionModal',
        components: {
            BootstrapModal,
        },
        data() {
            return {
                view: undefined,
                action: undefined,
            };
        },
        methods: {
            execute({ instances, action }) {
                this.instances = instances;
                this.action = action;
                this.openModal();
            },
            closeModal() {
                this.$refs.modal.close();
            },
            openModal() {
                this.$refs.modal.open();
            },
            async performDeletion(purge) {
                this.closeModal();
                if (this.$app.store.page.view.type === ViewTypes.PAGE) {
                    await this.$app.store.page.removeInstance({
                        instance: this.$app.store.page.instance,
                        purge,
                    });
                    return;
                }
                if (this.instances.length === 1) {
                    await this.$app.store.page.removeInstance({
                        action: this.action,
                        instance: this.instances.pop(),
                        fromList: true,
                        purge,
                    });
                    return;
                }
                await this.$app.store.page.removeInstances({
                    action: this.action,
                    instances: this.instances,
                    purge,
                });
            },
        },
    };
</script>
