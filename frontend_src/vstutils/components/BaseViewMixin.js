import BasestViewMixin from '../views/mixins/BasestViewMixin.js';
import CollapsibleCardMixin from './CollapsibleCardMixin.js';
import { findClosestPath, formatPath, path_pk_key } from '../utils';
import $ from 'jquery';
import { guiPopUp, pop_up_msg } from '../popUp';
import { ViewTypes } from '../views/View.js';

function* getParentViews(view) {
    if (view.parent) {
        yield view.parent;
        yield* getParentViews(view.parent);
    }
}

/**
 * @vue/component
 */
export const BaseViewMixin = {
    mixins: [BasestViewMixin, CollapsibleCardMixin],
    /**
     * Computed properties of Vue component.
     */
    computed: {
        /**
         * Title of View.
         */
        title() {
            return this.view.title;
        },
        actions() {
            return Array.from(this.view.actions.values());
        },
        sublinks() {
            return Array.from(this.view.sublinks.values());
        },

        /**
         * Breadcrumbs of View.
         */
        breadcrumbs() {
            return [
                { name: 'Home', link: '/' },
                ...Array.from(getParentViews(this.view))
                    .map((view) => ({
                        name: this.getViewNameForBreadcrumbs(view),
                        link: formatPath(view.path, this.$route.params),
                    }))
                    .reverse(),
                { name: this.getViewNameForBreadcrumbs(this.view) },
            ];
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
        title: 'setDocumentTitle',
    },
    /**
     * Vue Hook, that will be called after View Vue Component creation.
     */
    created() {
        this.setDocumentTitle();
        this.onCreatedHandler();
    },
    /**
     * Dict with methods of current Vue component.
     */
    methods: {
        getViewNameForBreadcrumbs(view) {
            if (view.type === ViewTypes.PAGE_NEW) return 'New';
            if (view.type === ViewTypes.PAGE_EDIT && !view.isEditStyleOnly) return 'Edit';

            const pk = view.pkParamName && this.$route.params[view.pkParamName];
            return pk || view.title;
        },
        /**
         * Method, that opens some page.
         * @param {object} options Options for router for new page opening.
         */
        openPage(options = {}) {
            return this.$router.push(options).catch((error) => {
                // Allow to open route with the same path as current
                if (error.name !== 'NavigationDuplicated') {
                    throw error;
                }
                return error;
            });
        },
        /**
         * Method, that sets <title></title> equal to this.title.
         */
        setDocumentTitle() {
            document.title = this.title;
        },
        /**
         * Method, that calls from created() Hook.
         */
        onCreatedHandler() {
            this.fetchData();
        },

        /**
         * Method, that tries to get redirect URL from response data.
         * @param {object} response_data response.data object.
         * @private
         */
        _getRedirectUrlFromResponse(response_data) {
            let pk_key;
            let pk_value;
            let redirect_path;

            for (let key in response_data) {
                if (key.indexOf('_id') !== -1) {
                    pk_key = key;
                    pk_value = response_data[key];
                }
            }

            if (!pk_key || pk_value === null) {
                return;
            }

            // tries to find appropriate redirect path in internal paths
            const paths = window.app.views
                .values()
                .filter(
                    (item) =>
                        item.schema.type === 'page' &&
                        item.schema.path.replace(/^\/|\/$/g, '').split('/').last === '{' + pk_key + '}',
                )
                .map((item) => item.schema.path);

            redirect_path = findClosestPath(paths, this.$route.name);

            if (redirect_path) {
                let obj = {};

                obj[pk_key] = pk_value;
                return redirect_path.format($.extend(true, {}, this.$route.params, obj)).replace(/\/$/g, '');
            }

            // tries to find appropriate redirect path in paths of 3rd level
            redirect_path = window.app.views
                .values()
                .filter((item) => {
                    if (
                        item.schema.path.indexOf(pk_key.replace('_id', '')) !== -1 &&
                        item.schema.type === 'page' &&
                        item.schema.level === 3
                    ) {
                        return item;
                    }
                })
                .map((item) => item.schema.path)[0];

            if (redirect_path) {
                let f_obj = {};

                f_obj[path_pk_key] = pk_value;

                return redirect_path.format(f_obj).replace(/\/$/g, '');
            }
        },

        async executeEmptyAction(action, instance = undefined, oneOfMultiple = false) {
            const path = formatPath(action.path, this.$route.params, instance);

            try {
                const response = await this.queryset.execute({ method: action.method, path });

                guiPopUp.success(
                    this.$t(pop_up_msg.instance.success.executeEmpty).format([
                        this.$t(action.title),
                        this.$t(instance?.getViewFieldString() || this.view.title),
                    ]),
                );

                if (response && response.data) {
                    try {
                        let redirect_path = this._getRedirectUrlFromResponse(response.data);

                        if (redirect_path) {
                            this.openPage({ path: redirect_path });
                        } else if (!oneOfMultiple) {
                            this.afterEmptyAction({ action, instance });
                        }
                    } catch (e) {
                        console.log(e);
                    }
                }
            } catch (error) {
                let str = window.app.error_handler.errorToString(error);

                let srt_to_show = this.$t(pop_up_msg.instance.error.executeEmpty).format([
                    this.$t(action.name),
                    this.$t(this.view.name),
                    str,
                ]);

                window.app.error_handler.showError(srt_to_show, str);
            }
        },

        /**
         * Method that will be executed after successful execution of empty action if no redirect url found.
         * @param {Object} obj
         */
        // eslint-disable-next-line no-unused-vars
        afterEmptyAction(obj) {},

        executeAction(action, instance = undefined, oneOfMultiple = false) {
            if (typeof this[`${action.name}Instance`] === 'function' && instance) {
                return this[`${action.name}Instance`](action, instance);
            }

            if (action.isEmpty) {
                return this.executeEmptyAction(action, instance, false);
            }

            const path = action.href || action.view?.path;
            if (path) {
                return this.$router.push(formatPath(path, this.$route.params, instance));
            }

            throw new Error(`Cannot execute action ${action.name} on instance ${instance}`);
        },
        openSublink(sublink, instance = undefined) {
            return this.$router.push(formatPath(sublink.href, this.$route.params, instance));
        },
        /**
         * Method, that gets data for a current view.
         */
        fetchData() {
            this.setLoadingSuccessful();
        },
    },
};
