<template>
    <BootstrapModal ref="modal" :title="$t(action.title)">
        <template #activator="{ openModal }">
            <button class="dropdown-item" type="button" @click="openModal" v-text="$st(action.title)" />
        </template>

        <div class="container">
            <ModelFields
                :data="sandbox"
                :model="model"
                :editable="true"
                :fields-groups="fieldsGroups"
                :fields-errors="fieldsErrors"
                :hide-read-only="true"
                :hide-not-required="hideNotRequired"
                @set-value="setFieldValue"
            />
        </div>

        <template #footer>
            <button type="button" class="btn btn-primary" @click="execute">
                {{ $t('Execute') }}
            </button>
        </template>
    </BootstrapModal>
</template>

<script>
    import { defineComponent } from 'vue';
    import BootstrapModal from '../BootstrapModal.vue';
    import ModelFields from '../page/ModelFields.vue';
    import { guiPopUp, pop_up_msg } from '../../popUp';
    import { formatPath, parseResponseMessage, getUniqueId } from '../../utils';
    import { createActionStore } from './../../store/helpers';
    import { defineStore } from 'pinia';

    export default defineComponent({
        name: 'NotEmptyMultiactionModal',
        components: { BootstrapModal, ModelFields },
        props: {
            action: { type: Object, required: true },
        },
        setup(props) {
            const useStore = defineStore(`notEmptyMultiActionModal_${getUniqueId()}`, () =>
                createActionStore(props.action.view),
            );
            const store = useStore();
            return {
                store,
                model: store.model,
                sandbox: store.sandbox,
                fieldsGroups: store.fieldsGroups,
                fieldsErrors: store.fieldsErrors,
                changedFields: store.changedFields,
                instance: store.instance,
                setFieldValue: (...args) => store.setFieldValue(...args),
            };
        },
        data() {
            return {
                view: this.action.view,
                hideNotRequired: false,
            };
        },
        methods: {
            getRequestPaths() {
                return this.$app.store.page.instances
                    .filter((instance) => this.$app.store.page.selection.includes(instance.getPkValue()))
                    .map((instance) => formatPath(this.view.path, this.$route.params, instance));
            },
            async execute() {
                const instance = this.instance;
                try {
                    this.store.validateAndSetInstanceData();
                } catch (e) {
                    this.$app.error_handler.defineErrorAndShow(e);
                    return;
                }
                const method = this.view.method;
                const headers = { 'content-type': 'application/json' };
                const responses = await Promise.allSettled(
                    this.getRequestPaths().map((path) =>
                        this.$app.api.makeRequest({
                            method,
                            headers,
                            path,
                            data: instance._getInnerData(),
                            useBulk: instance.constructor.shouldUseBulk(method),
                        }),
                    ),
                );
                this.store.changedFields = [];
                for (const response of responses) {
                    if (response.status === 'fulfilled') {
                        guiPopUp.success(
                            this.$t(pop_up_msg.instance.success.execute, [
                                this.$t(this.view.title),
                                parseResponseMessage(response.value.data),
                            ]),
                        );
                    } else {
                        const str = this.$app.error_handler.errorToString(response.reason);
                        const srt_to_show = this.$t(pop_up_msg.instance.error.execute, [
                            this.$t(this.view.title),
                            str,
                        ]);
                        this.$app.error_handler.showError(srt_to_show, str);
                    }
                }
                this.$app.store.page.fetchData();
                this.$refs.modal.close();
            },
        },
    });
</script>
