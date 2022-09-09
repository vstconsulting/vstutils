import {
    capitalize,
    formatPath,
    joinPaths,
    pathToArray,
    ViewTypes,
    getRedirectUrlFromResponse,
} from '../utils';
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
                isListItem: false,
            };
            signals.emit(`<${this.view.path}>filterActions`, obj);
            return obj.actions;
        },
        sublinks() {
            const obj = {
                sublinks: Array.from(this.view.sublinks.values()).filter((sublink) => !sublink.hidden),
                data: this.data,
                isListItem: false,
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
                if (options.path && options.params) {
                    const route = this.$router.resolve(options)?.route;
                    if (route.name !== '404' && !route.meta?.view?.isDeepNested) {
                        options.name = route.name;
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
            return getRedirectUrlFromResponse(this.$app, responseData, modelClass);
        },

        async executeEmptyAction(action, instance = undefined) {
            await this.$app.actions.executeEmpty({ action, instance });
            this.afterEmptyAction({ action, instance });
        },

        /**
         * Method that will be executed after successful execution of empty action if no redirect url found.
         * @param {Object} obj
         */
        // eslint-disable-next-line no-unused-vars
        afterEmptyAction(obj) {},

        executeAction(action, instance = undefined, skipConfirmation = false) {
            return this.$app.actions.execute({
                action,
                instance,
                skipConfirmation,
                getCustomHandler: (action) => this[`${action.name}Instance`],
            });
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
        async fetchData() {
            this.setLoadingSuccessful();
        },
    },
};
