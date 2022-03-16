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
                viewComponent: undefined,
            };
        },
        methods: {
            execute({ instances, action }) {
                this.instances = instances;
                this.action = action;
                this.viewComponent = this.$root.$refs.currentViewComponent;
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
                if (this.viewComponent.view.type === ViewTypes.PAGE) {
                    await this.viewComponent.removeInstance(purge);
                    return;
                }
                if (this.instances.length === 1) {
                    await this.viewComponent.removeInstance(this.action, this.instances.pop(), purge);
                    return;
                }
                await this.viewComponent.removeInstances(this.action, this.instances, purge);
                await this.viewComponent.dispatchAction('toggleAllSelection');
                this.viewComponent.fetchData();
            },
        },
    };
</script>
