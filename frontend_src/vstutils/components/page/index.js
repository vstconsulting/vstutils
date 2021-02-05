/* eslint-disable vue/one-component-per-file */
import OneEntity from './OneEntity.vue';
import { current_view, formatPath, RequestTypes } from '../../utils';
import { guiPopUp, pop_up_msg } from '../../popUp';
import PageWithDataMixin from '../../views/mixins/PageWithDataMixin.js';
import { apiConnector } from '../../api';
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
        autoUpdatePK() {
            return this.getInstancePk();
        },
    },
    methods: {
        getInstancePk() {
            return this.$route.params[this.view.pkParamName];
        },
        async fetchData() {
            this.initLoading();
            try {
                await this.dispatchAction('fetchData', this.getInstancePk());

                this.setLoadingSuccessful();
                if (this.view.params.autoupdate) {
                    this.startAutoUpdate();
                }
            } catch (error) {
                this.setLoadingError(error);
            }
        },
        getBreadcrumbNameForCurrentPath() {
            if (this.instance) {
                return this.instance.getViewFieldValue();
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
        };
    },
    computed: {
        model() {
            return this.view.objects.getModelClass(RequestTypes.CREATE);
        },
    },
    methods: {
        async fetchData() {
            this.initLoading();
            await this.dispatchAction('fetchData');
            this.setLoadingSuccessful();
        },
        setFieldValue(obj) {
            this.isPageChanged = true;
            this.commitMutation('setFieldValue', obj);
        },
        /**
         * Method, that saves existing Model instance.
         * Method gets instance data, validates it and sends API request.
         */
        async saveInstance() {
            const instance = this.instance;
            try {
                instance._validateAndSetData(this.sandbox);
            } catch (e) {
                window.app.error_handler.defineErrorAndShow(e);
                current_view.setLoadingError({});
                return;
            }
            this.loading = true;
            try {
                if (this.view.type === ViewTypes.PAGE_EDIT) await instance.update(this.view.params.method);
                else await instance.create(this.view.params.method);

                this.loading = false;
                this.isPageChanged = false;

                guiPopUp.success(
                    this.$t(pop_up_msg.instance.success.save).format([
                        instance.getViewFieldValue() || instance.getPkValue() || '',
                        this.view.name,
                    ]),
                );
                this.openPage({ path: this.getRedirectUrl({ instance }) });
            } catch (error) {
                this.loading = false;
                let str = window.app.error_handler.errorToString(error);

                let srt_to_show = this.$t(pop_up_msg.instance.error.save).format([
                    instance.getViewFieldValue(),
                    this.$t(this.view.name),
                    str,
                ]);

                window.app.error_handler.showError(srt_to_show, str);
                // the code line below is needed for tests.
                current_view.setLoadingError(error);
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
            return this.view.objects.getModelClass(RequestTypes.UPDATE);
        },
    },
    methods: {
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
                this.isPageChanged = false;
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
            return Array.from(this.view.model.fields.values());
        },
        model() {
            return this.view.model;
        },
    },
    methods: {
        fetchData() {
            this.initLoading();
            const instance = new this.view.model();
            this.commitMutation('setInstance', instance);
            this.setLoadingSuccessful();
        },
        async executeInstance(action, instance) {
            try {
                instance._validateAndSetData(this.sandbox);
            } catch (e) {
                window.app.error_handler.defineErrorAndShow(e);
                current_view.setLoadingError({});
                return;
            }
            this.loading = true;
            try {
                await apiConnector.makeRequest({
                    method: this.view.method,
                    headers: { 'content-type': 'application/json' },
                    path: formatPath(this.view.path, this.$route.params),
                    data: JSON.stringify(instance._getInnerData()),
                });
                this.isPageChanged = false;
                guiPopUp.success(
                    this.$t(pop_up_msg.instance.success.execute).format([
                        this.$t(this.view.name),
                        instance.getViewFieldString()?.toLowerCase() || '',
                    ]),
                );
                this.openPage({ path: this.getRedirectUrl() });
            } catch (error) {
                const str = window.app.error_handler.errorToString(error);
                const srt_to_show = this.$t(pop_up_msg.instance.error.execute).format([
                    this.view.name,
                    instance.getViewFieldString()?.toLowerCase() || '',
                    str,
                ]);
                window.app.error_handler.showError(srt_to_show, str);
                // the code line below is needed for tests.
                current_view.setLoadingError({});
            } finally {
                this.loading = false;
            }
        },
        getRedirectUrl() {
            const parentView = this.$app.views.get(this.view.path.replace(/[^/]+\/$/, ''));
            if (parentView) {
                return formatPath(parentView.path, this.$route.params);
            }
            return this.$route.path;
        },
    },
};
