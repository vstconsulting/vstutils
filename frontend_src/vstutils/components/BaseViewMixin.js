import {
    capitalize,
    formatPath,
    iterFind,
    joinPaths,
    parseResponseMessage,
    pathToArray,
    ViewTypes,
} from '../utils';
import { guiPopUp, pop_up_msg } from '../popUp';
import BasestViewMixin from '../views/mixins/BasestViewMixin.js';
import CollapsibleCardMixin from './CollapsibleCardMixin.js';
import signals from '../signals';

/**
 * @vue/component
 */
export const BaseViewMixin = {
    mixins: [BasestViewMixin, CollapsibleCardMixin],
    inject: ['requestConfirmation'],
    props: {
        query: { type: Object, default: () => ({}) },
        params: { type: Object, default: () => ({}) },
    },
    /**
     * Computed properties of Vue component.
     */
    computed: {
        /**
         * Title of View.
         */
        title() {
            return this.$st(this.view.title);
        },
        actions() {
            const obj = {
                actions: Array.from(this.view.actions.values()).filter((action) => !action.hidden),
                data: this.data,
            };
            signals.emit(`<${this.view.path}>filterActions`, obj);
            return obj.actions;
        },
        sublinks() {
            const obj = {
                sublinks: Array.from(this.view.sublinks.values()).filter((sublink) => !sublink.hidden),
                data: this.data,
            };
            signals.emit(`<${this.view.path}>filterSublinks`, obj);
            return obj.sublinks;
        },

        /**
         * Breadcrumbs of View.
         */
        breadcrumbs() {
            if (!this.view) {
                return null;
            }

            const dt = pathToArray(this.$route.path);
            const crumbs = [{ iconClasses: 'fas fa-home', link: '/' }];
            for (let i = 0; i < dt.length; i++) {
                const { route } = this.$router.resolve(joinPaths(...dt.slice(0, i + 1)));
                const view = route?.meta?.view;
                if (view) {
                    crumbs.push({ link: route.path, ...this.getViewNameForBreadcrumbs(view, dt[i]) });
                }
            }

            if (crumbs.length > 4) {
                return [...crumbs.slice(0, 2), { name: '...' }, ...crumbs.slice(-2)];
            }
            return crumbs;
        },
        /**
         * Current URL of view.
         */
        url() {
            return this.$route.path;
        },
    },
    /**
     * Watches some events and calls handlers.
     */
    watch: {
        $route: 'fetchData',
    },
    /**
     * Vue Hook, that will be called after View Vue Component creation.
     */
    created() {
        this.onCreatedHandler();
    },
    /**
     * Dict with methods of current Vue component.
     */
    methods: {
        getViewNameForBreadcrumbs(view, fragment) {
            if (view.type === ViewTypes.PAGE_NEW) {
                return { iconClasses: 'fas fa-plus' };
            }
            if (view.type === ViewTypes.PAGE_EDIT && !view.isEditStyleOnly) {
                return { iconClasses: 'fas fa-pen' };
            }

            return { name: view.pkParamName ? capitalize(fragment) : view.title };
        },
        /**
         * Method, that opens some page.
         * @param {Object|string} options Options or path for router for new page opening.
         */
        openPage(options) {
            if (typeof options === 'object') {
                // Get name by path so additional params can be passed
                if (options.path) {
                    const name = this.$router.resolve(options)?.route?.name;
                    if (name && name !== '404') {
                        options.name = name;
                        delete options['path'];
                    }
                }
            } else {
                options = { path: options };
            }
            return this.$router.push(options).catch((error) => {
                // Allow to open route with the same path as current
                if (error.name !== 'NavigationDuplicated') {
                    throw error;
                }
                return error;
            });
        },
        /**
         * Method, that calls from created() Hook.
         */
        onCreatedHandler() {
            this.fetchData();
        },

        /**
         * Method, that tries to get redirect URL from response data.
         * @param {object} responseData response.data object.
         * @param {Function} [modelClass]
         * @private
         */
        _getRedirectUrlFromResponse(responseData, modelClass = this.view.params.responseModel) {
            if (!responseData || typeof responseData !== 'object') return;

            const field = iterFind(modelClass.fields.values(), (field) => field.redirect);
            if (!field) return;

            const redirect = field.redirect;

            let operationId = '';

            if (redirect.depend_field) {
                operationId += responseData[redirect.depend_field].toLowerCase();
            }
            if (!operationId || redirect.concat_field_name) {
                operationId = operationId + redirect.operation_name;
            }

            operationId += '_get';

            const matcher = (view) => view.operationId === operationId && view;
            const view = this.$app.viewsTree.findInAllPaths(matcher);

            if (!view) {
                console.warn(`Can't find redirect view for operationId: ${operationId}`, field, responseData);
                return;
            }

            return formatPath(view.path, { ...this.params, [view.pkParamName]: responseData[field.name] });
        },

        async executeEmptyAction(action, instance = undefined) {
            const path = formatPath(action.path, this.$route.params, instance);

            try {
                const response = await this.queryset.execute({ method: action.method, path });

                guiPopUp.success(
                    this.$t(pop_up_msg.instance.success.executeEmpty, [
                        this.$t(action.title),
                        instance?.getViewFieldString() || this.$t(this.view.title),
                        parseResponseMessage(response.data),
                    ]),
                );

                if (response && response.data) {
                    try {
                        let redirect_path = this._getRedirectUrlFromResponse(response.data);

                        if (redirect_path) {
                            this.openPage(redirect_path);
                        }
                        this.afterEmptyAction({ action, instance });
                    } catch (e) {
                        console.log(e);
                    }
                }
            } catch (error) {
                let str = this.$app.error_handler.errorToString(error);

                let srt_to_show = this.$t(pop_up_msg.instance.error.executeEmpty, [
                    this.$t(action.name),
                    this.$t(this.view.name),
                    str,
                    parseResponseMessage(error.data),
                ]);

                this.$app.error_handler.showError(srt_to_show, str);
            }
        },

        /**
         * Method that will be executed after successful execution of empty action if no redirect url found.
         * @param {Object} obj
         */
        // eslint-disable-next-line no-unused-vars
        afterEmptyAction(obj) {},

        executeAction(action, instance = undefined, skipConfirmation = false) {
            if (action.confirmationRequired && !skipConfirmation) {
                this.requestConfirmation(() => this.executeAction(action, instance, true), action.title);
                return;
            }

            if (typeof this[`${action.name}Instance`] === 'function') {
                return this[`${action.name}Instance`](action, instance);
            }

            if (action.isEmpty) {
                return this.executeEmptyAction(action, instance, false);
            }

            if (action.appendFragment) {
                if (this.view.type === ViewTypes.LIST && instance) {
                    return this.$router.push(
                        joinPaths(this.$route.path, instance.getPkValue(), action.appendFragment),
                    );
                }
                return this.$router.push(joinPaths(this.$route.path, action.appendFragment));
            }

            const path = action.href || action.view?.path;
            if (path) {
                return this.$router.push(formatPath(path, this.$route.params, instance));
            }

            throw new Error(`Cannot execute action ${action.name} on instance ${instance}`);
        },
        openSublink(sublink, instance = undefined) {
            const path = sublink.appendFragment
                ? joinPaths(this.$route.path, sublink.appendFragment)
                : sublink.href;
            return this.$router.push(formatPath(path, this.$route.params, instance));
        },
        /**
         * Method, that gets data for a current view.
         */
        fetchData() {
            this.setLoadingSuccessful();
        },
    },
};
