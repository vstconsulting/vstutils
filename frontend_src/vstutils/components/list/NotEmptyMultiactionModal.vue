<template>
    <BootstrapModal ref="modal" :title="title">
        <template #activator="{ openModal }">
            <button class="dropdown-item" type="button" @click="openModal" v-text="$st(action.title)" />
        </template>

        <div class="container">
            <ModelFields
                :data="data"
                :model="model"
                :editable="true"
                :fields-groups="fieldsGroups"
                :fields-errors="fieldsErrors"
                :hide-read-only="hideReadOnly"
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
    import BootstrapModal from '../BootstrapModal.vue';
    import { ActionViewComponent } from '../page';
    import { guiPopUp, pop_up_msg } from '../../popUp';
    import { formatPath, parseResponseMessage } from '../../utils';
    export default {
        name: 'NotEmptyMultiactionModal',
        components: { BootstrapModal },
        mixins: [ActionViewComponent],
        inject: ['pageComponent'],
        props: {
            action: { type: Object, required: true },
        },
        data() {
            return {
                view: this.action.view,
                controlTitle: false,
            };
        },
        computed: {
            model() {
                return this.action.requestModel;
            },
        },
        methods: {
            getRequestPaths() {
                return this.pageComponent.instances
                    .filter((instance) => this.pageComponent.selection.includes(instance.getPkValue()))
                    .map((instance) => formatPath(this.view.path, this.$route.params, instance));
            },
            async execute() {
                const instance = this.instance;
                try {
                    this.commitMutation('validateAndSetInstanceData', { instance });
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
                this.changedFields = [];
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
                this.pageComponent.fetchData();
                this.$refs.modal.close();
            },
        },
    };
</script>
