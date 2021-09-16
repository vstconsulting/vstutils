/* eslint-disable vue/one-component-per-file */
import OneEntity from './OneEntity.vue';
import {
    formatPath,
    joinPaths,
    ModelValidationError,
    parseResponseMessage,
    pathToArray,
    RequestTypes,
} from '../../utils';
import { guiPopUp, pop_up_msg } from '../../popUp';
import PageWithDataMixin from '../../views/mixins/PageWithDataMixin.js';
import { ViewTypes } from '../../views';
import { LeaveConfirmationMixin } from './LeaveConfirmationMixin.js';

export { OneEntity, LeaveConfirmationMixin };

/**
 * @vue/component
 */
export const PageViewComponent = {
    name: 'PageViewComponent',
    mixins: [OneEntity],
    data() {
        return {
            readOnly: true,
        };
    },
    computed: {
        providedInstance() {
            return this.params.providedInstance || null;
        },
    },
    methods: {
        shouldStartAutoupdate() {
            return this.view.params.autoupdate;
        },
        getInstancePk() {
            return this.$route.params[this.view.pkParamName];
        },
        async fetchData() {
            this.initLoading();
            try {
                if (this.providedInstance) {
                    this.commitMutation('setInstance', this.providedInstance);
                } else {
                    await this.dispatchAction('fetchData', this.getInstancePk());
                }

                this.setLoadingSuccessful();
                if (this.shouldStartAutoupdate()) {
                    this.startAutoUpdate();
                }
            } catch (error) {
                this.setLoadingError(error);
            }
        },
        afterEmptyAction() {
            return this.dispatchAction('updateData');
        },
    },
};

/**
 * @vue/component
 */
export const PageNewViewComponent = {
    name: 'PageNewViewComponent',
    mixins: [PageViewComponent, PageWithDataMixin, LeaveConfirmationMixin],
    data() {
        return {
            readOnly: false,
            hideReadOnly: true,
            changedFields: [],
        };
    },
    computed: {
        model() {
            return this.view.objects.getRequestModelClass(RequestTypes.CREATE);
        },
        shouldAskForLeaveConfirmation() {
            return this.changedFields.length > 0;
        },
        isDeepNested() {
            // Our parent must be list that is deep nested
            return this.view.parent?.deepNestedParentView;
        },
    },
    methods: {
        async fetchData() {
            this.initLoading();
            await this.dispatchAction('fetchData', { data: this.query });
            this.fieldsErrors = {};
            this.changedFields = [];
            this.setLoadingSuccessful();
        },
        setFieldValue(obj) {
            this.isPageChanged = true;
            if (!this.changedFields.includes(obj.field)) this.changedFields.push(obj.field);
            OneEntity.methods.setFieldValue.call(this, obj);
        },
        /**
         * Method, that saves existing Model instance.
         * Method gets instance data, validates it and sends API request.
         */
        async saveInstance() {
            try {
                this.commitMutation('validateAndSetInstanceData');
            } catch (e) {
                this.$app.error_handler.defineErrorAndShow(e);
                if (e instanceof ModelValidationError) {
                    this.fieldsErrors = e.toFieldsErrors();
                }
                return;
            }
            this.loading = true;
            const instance = this.instance;
            const isUpdate = this.view.type === ViewTypes.PAGE_EDIT;
            const name = instance.getViewFieldString() || instance.getPkValue() || '';
            try {
                const method = this.view.params.method;

                const providedInstance = isUpdate
                    ? await instance.update(method, this.view.isPartial ? this.changedFields : null)
                    : await instance.create(method);

                this.isPageChanged = false;
                this.changedFields = [];
                this.fieldsErrors = {};

                guiPopUp.success(this.$t(pop_up_msg.instance.success.save, [name, this.view.name]));
                if (this.isDeepNested) {
                    return this.openPage(this.getRedirectUrl({ instance }));
                }
                this.openPage({ path: this.getRedirectUrl({ instance }), params: { providedInstance } });
            } catch (error) {
                const modelValidationError = instance.constructor.parseModelValidationError(error.data);
                if (modelValidationError) {
                    this.fieldsErrors = modelValidationError.toFieldsErrors();
                }
                this.$app.error_handler.showError(
                    this.$t(isUpdate ? pop_up_msg.instance.error.save : pop_up_msg.instance.error.create, [
                        this.$app.error_handler.errorToString(modelValidationError || error),
                    ]),
                );
            } finally {
                this.loading = false;
            }
        },
    },
};

/**
 * @vue/component
 */
export const PageEditViewComponent = {
    name: 'PageEditViewComponent',
    mixins: [PageNewViewComponent],
    computed: {
        model() {
            const requestType = this.view.isPartial ? RequestTypes.PARTIAL_UPDATE : RequestTypes.UPDATE;
            return this.view.objects.getRequestModelClass(requestType);
        },
        isDeepNested() {
            // Our parent is detail view which parent is deep nested list view
            return this.view.parent?.parent?.deepNestedParentView;
        },
    },
    methods: {
        cancelInstance() {
            this.changedFields = [];
            this.$root.goBack();
        },
        async fetchData() {
            this.initLoading();
            try {
                await this.dispatchAction('fetchData', this.getInstancePk());
                this.setLoadingSuccessful();
            } catch (error) {
                this.setLoadingError(error);
            }
        },
        async reloadInstance() {
            this.initLoading();
            try {
                await this.dispatchAction('reloadInstance');
                this.setLoadingSuccessful();
                this.changedFields = [];
            } catch (error) {
                this.setLoadingError(error);
            }
        },
    },
};

/**
 * @vue/component
 */
export const ActionViewComponent = {
    name: 'ActionViewComponent',
    mixins: [PageNewViewComponent],
    computed: {
        fields() {
            return Array.from(this.model.fields.values());
        },
        model() {
            return this.view.params.requestModel;
        },
        title() {
            return this.$t(this.view.title);
        },
    },
    methods: {
        fetchData() {
            this.registerStoreModule();
            this.initLoading();
            const instance = new this.model();
            this.commitMutation('setInstance', instance);
            this.setLoadingSuccessful();
        },
        getActionRequestPath() {
            const rootNestedView = this.view.parent?.parent?.deepNestedParentView;
            if (rootNestedView) {
                const [pk, actionName] = pathToArray(this.$route.path).slice(-2);
                return joinPaths(formatPath(rootNestedView.path, this.params), pk, actionName);
            }
            return formatPath(this.view.path, this.$route.params);
        },
        async executeInstance(action, instance) {
            try {
                this.commitMutation('validateAndSetInstanceData', { instance });
            } catch (e) {
                this.$app.error_handler.defineErrorAndShow(e);
                if (e instanceof ModelValidationError) {
                    this.fieldsErrors = e.toFieldsErrors();
                }
                return;
            }
            this.loading = true;
            try {
                const response = await this.$app.api.makeRequest({
                    method: this.view.method,
                    headers: { 'content-type': 'application/json' },
                    path: this.getActionRequestPath(),
                    data: JSON.stringify(instance._getInnerData()),
                    useBulk: instance.constructor.shouldUseBulk(this.view.method),
                });
                this.changedFields = [];
                this.fieldsErrors = {};
                guiPopUp.success(
                    this.$t(pop_up_msg.instance.success.execute, [
                        this.$t(this.view.title),
                        parseResponseMessage(response.data),
                    ]),
                );
                this.openPage(this._getRedirectUrlFromResponse(response.data) || this.getRedirectUrl());
            } catch (error) {
                const modelValidationError = instance.constructor.parseModelValidationError(error.data);
                if (modelValidationError) {
                    this.fieldsErrors = modelValidationError.toFieldsErrors();
                }
                this.$app.error_handler.showError(
                    this.$t(pop_up_msg.instance.error.execute, [
                        this.$t(this.view.title),
                        this.$app.error_handler.errorToString(modelValidationError || error),
                    ]),
                );
            } finally {
                this.loading = false;
            }
        },
        getRedirectUrl() {
            if (this.view?.parent?.parent?.deepNestedParentView) {
                return this.$route.path.replace(/[^/]+\/$/, '');
            }
            const parentView = this.$app.views.get(this.view.path.replace(/[^/]+\/$/, ''));
            if (parentView) {
                return formatPath(parentView.path, this.$route.params);
            }
            return this.$route.path;
        },
    },
};
