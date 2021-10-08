<template>
    <BootstrapModal ref="modal">
        <template #activator="{ openModal }">
            <button class="dropdown-item" type="button" @click="openModal" v-text="$st(action.title)" />
        </template>
        <template #content="{ closeModal }">
            <div class="modal-header">
                <h5 class="modal-title">
                    {{ title }}
                </h5>
                <button type="button" class="close" aria-label="Close" @click="closeModal">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="container">
                    <div class="row">
                        <div
                            v-for="(fields, groupName) in fieldsGroups"
                            :key="groupName"
                            :class="fieldsGroupClasses(groupName)"
                        >
                            <div class="card">
                                <h5 v-if="groupName" class="card-header">
                                    {{ $t(groupName) }}
                                </h5>
                                <div class="card-body">
                                    <component
                                        :is="field.component"
                                        v-for="field in fields"
                                        :key="field.name"
                                        :field="field"
                                        :data="data"
                                        :type="fieldsType"
                                        :hideable="hideNotRequired && !field.required"
                                        @hide-field="hiddenFields.push(field)"
                                        @set-value="setFieldValue"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" @click="execute">
                    {{ $t('Execute') }}
                </button>
            </div>
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
                try {
                    const method = this.view.method;
                    const headers = { 'content-type': 'application/json' };
                    const responses = await Promise.all(
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
                        guiPopUp.success(
                            this.$t(pop_up_msg.instance.success.execute, [
                                this.$t(this.view.title),
                                parseResponseMessage(response.data),
                            ]),
                        );
                    }
                    this.pageComponent.fetchData();
                } catch (error) {
                    const str = this.$app.error_handler.errorToString(error);
                    const srt_to_show = this.$t(pop_up_msg.instance.error.execute, [
                        this.$t(this.view.title),
                        str,
                    ]);
                    this.$app.error_handler.showError(srt_to_show, str);
                } finally {
                    this.$refs.modal.close();
                }
            },
        },
    };
</script>
