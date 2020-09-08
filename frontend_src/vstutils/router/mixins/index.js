import $ from 'jquery';

import { COMPONENTS_MODULE_NAME } from '../../store/components_state/mutation-types';
import { current_view, path_pk_key, findClosestPath, isEmptyObject } from '../../utils';
import { pop_up_msg, guiPopUp } from '../../popUp';
import ViewWithParentInstancesForPath from '../../views/ViewWithParentInstancesForPath.js';

import { Home, NotFound } from '../customPages';

import BasestViewMixin from './BasestViewMixin';
import PageWithDataMixin from './PageWithDataMixin.js';
import EditablePageMixin from './EditablePageMixin.js';
import ViewWithAutoUpdateMixin from './ViewWithAutoUpdateMixin.js';
import CollapsibleCardMixin from './CollapsibleCardMixin.js';

export {
    BasestViewMixin,
    PageWithDataMixin,
    EditablePageMixin,
    ViewWithAutoUpdateMixin,
    CollapsibleCardMixin,
};

/**
 * Object with properties of list views.
 */
let list_props = {
    page_size: 20,
};

/**
 * Dict with mixins for Vue components, generated for guiViews.
 */
export let routesComponentsTemplates = {
    /**
     * Base mixin - common mixin for all views types.
     */
    base: {
        mixins: [BasestViewMixin, CollapsibleCardMixin, ViewWithParentInstancesForPath],
        provide() {
            return { getParentPaths: this.getParentPaths };
        },
        /**
         * Data property of Vue component.
         */
        data: function () {
            return {
                data: {
                    /**
                     * Property with view Model instance.
                     */
                    instance: {},
                    /**
                     * Property with view Parents Model instances.
                     */
                    parent_instances: {},
                },
            };
        },
        /**
         * Computed properties of Vue component.
         */
        computed: {
            /**
             * Property, that returns object with options for child components.
             */
            opt() {
                return {
                    store_url: this.qs_url.replace(/^\/|\/$/g, ''),
                };
            },
            /**
             * Name of component, that represents page's content body.
             */
            content_body_component: function () {
                return 'gui_entity_' + this.view.schema.type;
            },
            /**
             * Name of component, that represents page's content header.
             */
            content_header_component: function () {
                return;
            },
            /**
             * Name of component, that represents page's content footer.
             */
            content_footer_component: function () {
                return;
            },
            /**
             * Component for additional content.
             */
            content_additional: function () {
                return;
            },
            /**
             * Title of View.
             */
            title: function () {
                return this.view.schema.name;
            },
            /**
             * Property that returns total number total number of instances, or -1 if
             * instances has no count
             * @returns {number}
             */
            totalNumberOfInstances() {
                if (
                    this.data.instances &&
                    this.data.instances.extra &&
                    this.data.instances.extra.count !== undefined
                ) {
                    return this.data.instances.extra.count;
                }
                return -1;
            },
            /**
             * Breadcrumbs of View.
             */
            breadcrumbs: function () {
                let breadcrumb = [
                    {
                        name: 'Home',
                        link: '/',
                    },
                ];

                return breadcrumb.concat(this.getBreadcrumbParentPart(), this.getBreadcrumbCurrentPath());
            },
            /**
             * Current URL of view.
             */
            url: function () {
                return this.$route.path;
            },
            /**
             * Current URL of view's QuerySet.
             */
            qs_url: function () {
                return this.url.replace(/^\/|\/$/g, '');
            },
            /**
             * Property, that returns error data, if it exists.
             */
            error_data: function () {
                if (!this.error) {
                    return;
                }

                return window.app.error_handler.errorToString(this.error);
            },
        },
        /**
         * Vue Hook, that will be called after View Vue Component mount.
         */
        mounted() {
            // Handler for a events, generated from children components of this component.
            this.$root.$on('eventHandler-' + this.$root.$children.last._uid, this.eventHandler);
        },
        /**
         * Vue Hook, that will be called after View Vue Component creation.
         */
        created() {
            this.onCreatedHandler();
        },
        /**
         * Watches some events and calls handlers.
         */
        watch: {
            $route: 'fetchData',
        },
        /**
         * Dict with methods of current Vue component.
         */
        methods: {
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
             * Method, that makes redirect to some page.
             * @param {object} options Options for router for redirect page opening.
             */
            openRedirectUrl(options = {}) {
                this.openPage(options);
            },
            /**
             * Method, that calls from created() Hook.
             */
            onCreatedHandler() {
                this.fetchData();
            },
            /**
             * Method, that handles events, generated from children components of this component.
             * @param {string} method Name of event handler.
             * @param {object} opt Object with some arguments for event handler.
             */
            eventHandler(method, opt) {
                if (this[method]) {
                    this[method](opt);
                }
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
                let paths = Object.values(window.app.views)
                    .filter((item) => {
                        if (
                            item.schema.type === 'page' &&
                            item.schema.path.replace(/^\/|\/$/g, '').split('/').last === '{' + pk_key + '}'
                        ) {
                            return item;
                        }
                    })
                    .map((item) => item.schema.path);

                redirect_path = findClosestPath(paths, this.$route.name);

                if (redirect_path) {
                    let obj = {};

                    obj[pk_key] = pk_value;
                    return redirect_path
                        .format($.extend(true, {}, this.$route.params, obj))
                        .replace(/\/$/g, '');
                }

                // tries to find appropriate redirect path in paths of 3rd level
                redirect_path = Object.values(window.app.views)
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

            /**
             * Method, that executes Empty action on instance.
             * @param {object} opt Object with properties for empty action execution.
             */
            async executeEmptyActionOnInstance(opt = {}) {
                let url = this._executeEmptyActionOnInstance_getUrl(opt);

                if (!url) {
                    return;
                }

                let method = opt.query_type || 'post';
                let qs = this.getQuerySet(this.view, this.qs_url).clone({ url: url });

                try {
                    const response = await qs.execute({ method, path: qs.getDataType(), query: qs.query });

                    guiPopUp.success(
                        this.$t(pop_up_msg.instance.success.execute).format([
                            this.$t(opt.name),
                            this.$t(this.view.schema.name),
                        ]),
                    );

                    if (response && response.data) {
                        try {
                            let redirect_path = this._getRedirectUrlFromResponse(response.data);

                            if (redirect_path) {
                                this.openRedirectUrl({ path: redirect_path });
                            }
                        } catch (e) {
                            console.log(e);
                        }
                    }
                } catch (error) {
                    let str = window.app.error_handler.errorToString(error);

                    let srt_to_show = this.$t(pop_up_msg.instance.error.execute).format([
                        this.$t(opt.name),
                        this.$t(this.view.schema.name),
                        str,
                    ]);

                    window.app.error_handler.showError(srt_to_show, str);
                }
            },
            /**
             * Method, returns url for empty action QuerySet.
             * @param {object} opt Object with properties for empty action execution.
             */
            _executeEmptyActionOnInstance_getUrl(opt = {}) {
                if (!opt.path) {
                    return;
                }

                return opt.path.format(this.$route.params);
            },

            /**
             * Method, that sets view's current url to view's QuerySet
             * and saves in into main QuerySet store.
             * @param {object} view JS object, with options for a current view.
             * @param {string} url QuerySet URL.
             * @param {object} qs QuerySet instance (not required argument).
             */
            setQuerySet(view, url, qs = undefined) {
                this.$store.commit(
                    `${COMPONENTS_MODULE_NAME}/${this.componentId}/setQuerySet`,
                    { view, url, qs }
                    )
                return this.getQuerySet(view, url);
            },
            /**
             * Method, that returns view's QuerySet from main QuerySet store.
             * @param {object} view JS object, with options for a current view.
             * @param {string} url QuerySet URL.
             * @return {QuerySet} QuerySet.
             */
            getQuerySet(view, url) {
                let qs = this.$store.getters[`${COMPONENTS_MODULE_NAME}/${this.componentId}/queryset`]

                if (qs) {
                    return qs;
                }

                return this.setQuerySet(view, url);
            },
            /**
             * Method, that deletes view's QuerySet from main QuerySet store.
             * @param {string} url QuerySet URL.
             */
            deleteQuerySet(url) {
                this.$store.commit('deleteQuerySet', {
                    url: url.replace(/^\/|\/$/g, ''),
                });
            },
            /**
             * Method, that deletes view's QuerySet from Sandbox QuerySet store.
             * @param {string} url QuerySet URL.
             */
            deleteQuerySetFromSandBox(url) {
                this.$store.commit('deleteQuerySetFromSandBox', {
                    url: url.replace(/^\/|\/$/g, ''),
                });
            },
            /**
             * Method, that returns promise of getting current view's Model Instance.
             * @param {object} view JS object, with options for a current view.
             * @param {string} url QuerySet URL.
             * @return {promise}
             */
            getInstance(view, url) {
                return this.getQuerySet(view, url).get();
            },
            /**
             * Method, that finds all inner paths in current path
             * and returns array, that contains objects with inner paths and inner urls.
             * @param {string=} path Path of current view.
             * @param {string=} url URL of current view.
             * @return {array}
             */
            getParentPaths(path = this.$route.name, url = this.$route.path) {
                let result = [];
                let views = this.$store.getters.getViews;
                let inner_path = '/';
                let inner_url = '/';
                let path_parts = path.replace(/^\/|\/$/g, '').split('/');
                let url_parts = url.replace(/^\/|\/$/g, '').split('/');

                for (let i = 0; i < path_parts.length; i++) {
                    let test_path = inner_path + path_parts[i] + '/';
                    let test_url = inner_url + url_parts[i] + '/';

                    if (views[test_path]) {
                        if (test_path === this.$route.name) {
                            continue;
                        }

                        inner_path = test_path;
                        inner_url = test_url;

                        result.push({
                            path: inner_path,
                            url: inner_url,
                        });
                    }
                }

                return this.handleParentPaths(result);
            },
            // eslint-disable-next-line no-unused-vars
            getSubViewUrl(innerPathObj, views) {
                return innerPathObj.url;
            },
            /**
             * Method, that can change in some way parent_paths values.
             * @param {array} parent_paths
             */
            handleParentPaths(parent_paths) {
                return parent_paths;
            },

            /**
             * Method, that defines should be parent instance's data loaded or not.
             * @param {object} views Dict with views objects.
             * @param {object} obj Object with path and url of parent object.
             */
            loadParentInstanceOrNot(views, obj) {
                if (views[obj.path] && views[obj.path].schema.type == 'list') {
                    return false;
                }

                return true;
            },
            /**
             * Method, that gets data for a current view.
             */
            fetchData() {
                this.setLoadingSuccessful();
            },
            /**
             * Method, that returns alternative name for breadcrumb of current path(url).
             */
            getBreadcrumbNameForCurrentPath() {
                return false;
            },
            /**
             * Method, that returns breadcrumbs for parents path of current view's path.
             */
            getBreadcrumbParentPart() {
                let breadcrumb = [];
                let parent_links = this.getParentPaths(this.$route.name, this.$route.path);

                for (let index = 0; index < parent_links.length; index++) {
                    let parent_link = parent_links[index];
                    let name = parent_link.url.replace(/^\/|\/$/g, '').split('/').last;
                    let name_1;

                    if (this.data.parent_instances[parent_link.url]) {
                        name_1 = this.data.parent_instances[parent_link.url].getViewFieldValue();
                    }

                    breadcrumb.push({
                        name: name_1 || name,
                        link: parent_link.url.replace(/\/$/g, ''),
                    });
                }

                return breadcrumb;
            },
            /**
             * Method, that returns breadcrumbs for last child part of current view path.
             * If there are any filters, this method returns breadcrumbs for them too.
             * If there is pagination, this methods returns breadcrumbs for it too.
             */
            getBreadcrumbCurrentPath() {
                let breadcrumb = [];

                let name = this.url.replace(/\/$/g, '').split('/').last;
                let name_1 = this.getBreadcrumbNameForCurrentPath();
                // variable for breadcrumb for last child part of current view path
                let current_bc = {
                    name: name_1 || name,
                };
                // if there is no filters and pagination, returns breadcrumbs
                if (isEmptyObject(this.$route.query)) {
                    breadcrumb.push(current_bc);
                    return breadcrumb;
                }

                current_bc.link = this.$route.path.replace(/\/$/g, '');
                breadcrumb.push(current_bc);

                // else defines filters and pagination
                let filters = [];
                let filters_keys = Object.keys(this.$route.query);
                let page = this.$route.query.page;

                if (page) {
                    filters_keys.splice(filters_keys.indexOf('page'), 1);
                }

                for (let index = 0; index < filters_keys.length; index++) {
                    let key = filters_keys[index];
                    filters.push([key, this.$route.query[key]].join('='));
                }

                if (filters.length > 0) {
                    let obj = {
                        name: 'search: ' + filters.join('&'),
                    };

                    if (page) {
                        obj.link = this.$route.path.replace(/\/$/g, '') + '?' + filters.join('&');
                    }

                    breadcrumb.push(obj);
                }

                if (page) {
                    breadcrumb.push({
                        name: 'page=' + page,
                    });
                }

                return breadcrumb;
            },
        },
    },
    list: {
        mixins: [ViewWithAutoUpdateMixin],
        data: function () {
            return {
                data: {
                    /**
                     * Property, that has info about pagination properties.
                     */
                    pagination: {
                        count: 0,
                        page_size: list_props.page_size,
                        page_number: 1,
                    },
                    /**
                     * Property, that has info about list filters.
                     */
                    filters: {},
                    /**
                     * Property with list view Model instances.
                     */
                    instances: {},
                    parent_instances: {},
                },
            };
        },
        computed: {
            /**
             * Component with multi-actions button and bottom pagination.
             * @return {string}
             */
            multi_actions_button_component() {
                return 'gui_entity_' + this.view.schema.type + '_footer';
            },
            filters() {
                return this.$store.getters[this.store_name + '/filters'];
            }
        },
        methods: {
            /**
             * Redefinition of 'onCreatedHandler()' from base mixin.
             */
            onCreatedHandler() {
                this.setSelection(this.qs_url);
                this.fetchData();
            },
            /**
             * Redefinition of 'fetchData()' from base mixin.
             */
            fetchData() {
                this.initLoading();

                this.$store.dispatch(
                {
                    type: `${this.store_name}/fetchData`,
                    view: this.view,
                    url: this.url,
                    filters: this.generateBaseFilters(),
                    many: true
                }).then((instances) => {
                    this.setLoadingSuccessful();
                    if (this.view.schema.autoupdate) {
                        this.startAutoUpdate();
                    }
                }).catch((error) => {
                    this.setLoadingError(error);
                })

                this.getParentInstancesForPath();
            },
            /**
             * Method, that creates object for saving info about
             * which instance in list was selected.
             * @param {string} url QuerySet URL.
             */
            setSelection(url) {
                url = url.replace(/^\/|\/$/g, '');
                if (!this.$store.getters.getSelections(url)) {
                    this.$store.commit('setSelection', url);
                }
            },
            /**
             * Method, that generates object
             * with values of base list QuerySet filters(limit, offset).
             * @return {object}
             */
            generateBaseFilters() {
                let limit = this.datastore.data.pagination.page_size;
                let page = this.$route.query.page || 1;
                let query = {
                    limit: limit,
                    offset: limit * (page - 1),
                };

                return $.extend(true, query, this.$route.query);
            },
            /**
             * Method, that returns object with values of QuerySet filters from store.
             * @return {object}
             */
            getFiltersPrepared() {
                let filters = {...this.filters};

                for (let key in filters) {
                    if (Object.prototype.hasOwnProperty.call(filters, key) && filters[key] === undefined) {
                        delete filters[key];
                    }
                }

                return filters;
            },
            /**
             * Method, that handles 'filterInstances' event.
             * Method opens page, that satisfies current filters values.
             */
            filterInstances() {
                let hidden_filters = ['offset', 'limit', 'page'];
                let filters = this.getFiltersPrepared();

                for (let filter in filters) {
                    if (hidden_filters.includes(filter)) {
                        delete filters[filter];
                    }
                }

                return this.openPage({
                    name: this.$route.name,
                    params: this.$route.params,
                    query: filters,
                });
            },
            /**
             * @param {Model} instance
             */
            _removeInstance(instance) {
                instance
                    .delete()
                    .then((response) => {
                        this.removeInstances_callback(instance, response);
                    })
                    .catch((error) => {
                        let str = window.app.error_handler.errorToString(error);

                        let srt_to_show = this.$t(pop_up_msg.instance.error.remove).format([
                            instance.getViewFieldValue(),
                            this.$t(this.view.schema.name),
                            str,
                        ]);

                        window.app.error_handler.showError(srt_to_show, str);
                    });
            },
            /**
             * Method, that deletes one instance from list:
             * - Model Instance;
             * - QuerySet of current view from main QS Store;
             * - QuerySet of current view from sandbox QS Store.
             * @return {promise}
             */
            removeInstance({ instance_id }) {
                let instance;
                for (let index = 0; index < this.datastore.data.instances.length; index++) {
                    instance = this.datastore.data.instances[index];

                    if (instance.getPkValue() === instance_id) {
                        break;
                    }
                }

                if (!instance) {
                    return;
                }

                this._removeInstance(instance);
            },
            /**
             * Method, that removes instances from list.
             */
            removeInstances() {
                let selections = this.$store.getters.getSelections(this.qs_url.replace(/^\/|\/$/g, ''));

                for (let id in selections) {
                    if (!selections[id]) {
                        continue;
                    }

                    for (let index = 0; index < this.datastore.data.instances.length; index++) {
                        let instance = this.datastore.data.instances[index];
                        if (id === '' + instance.getPkValue()) {
                            this._removeInstance(instance);
                        }
                    }
                }
            },
            /**
             * Callback on successful instance remove from instances list.
             * @param {object} instance Instance, tht was removed in API.
             * @param {object} response API response.
             */
            // eslint-disable-next-line no-unused-vars
            removeInstances_callback(instance, response) {
                guiPopUp.success(
                    this.$t(pop_up_msg.instance.success.remove).format([
                        instance.getViewFieldValue() || instance.getPkValue(),
                        this.$t(this.view.schema.name),
                    ]),
                );

                let url = this.qs_url.replace(/^\/|\/$/g, '') + '/' + instance.getPkValue();

                this.deleteQuerySet(url);

                let ids = {};

                ids[instance.getPkValue()] = false;

                this.$store.commit('setSelectionValuesByIds', {
                    url: this.qs_url.replace(/^\/|\/$/g, ''),
                    ids: ids,
                });

                let new_qs = this.getQuerySet(this.view, this.qs_url).copy();

                if (!new_qs.cache) {
                    return;
                }

                for (let index = 0; index < new_qs.cache.length; index++) {
                    let list_instance = new_qs.cache[index];

                    if (list_instance.getPkValue() === instance.getPkValue()) {
                        new_qs.cache.splice(index, 1);

                        this.setQuerySet(this.view, this.qs_url, new_qs);

                        this.getInstancesList(this.view, this.qs_url).then((instances) => {
                            this.setInstancesToData(instances);
                        });
                    }
                }
            },
            /**
             * Redefinition of 'updateData()' method from view_with_autoupdate_mixin.
             */
            async updateData() {
                const qs = this.getQuerySet(this.view, this.qs_url);
                this.setInstancesToData(await qs.items(false));
            },
            executeEmptyActionOnInstances(opt = {}) {
                const selectionUrl = this.qs_url.replace(/^\/|\/$/g, '');
                const selected = Object.keys(this.$store.getters.getSelections(selectionUrl));

                for (let instance_id of selected) {
                    this.executeEmptyActionOnInstance({ ...opt, instance_id });
                }

                this.$store.commit('setSelection', selectionUrl);
            },
            /**
             * Redefinition of base '_executeEmptyActionOnInstance_getUrl' method.
             * @param {object} opt Object with properties for empty action execution.
             */
            _executeEmptyActionOnInstance_getUrl(opt = {}) {
                if (!opt.instance_id) {
                    return;
                }

                return this.$route.path.replace(/\/$/g, '') + '/' + opt.instance_id + '/' + opt.name + '/';
            },
            /**
             * Method, that adds child instance to parent list.
             * @param {object} opt
             */
            async addChildInstance(opt) {
                let qs = this.getQuerySet(this.view, this.qs_url);
                try {
                    await qs.execute({ method: 'post', path: qs.getDataType(), data: opt.data });
                    guiPopUp.success(
                        this.$t(pop_up_msg.instance.success.add).format([this.$t(this.view.schema.name)]),
                    );
                } catch (error) {
                    let str = window.app.error_handler.errorToString(error);
                    let srt_to_show = this.$t(pop_up_msg.instance.error.add).format([
                        this.$t(this.view.schema.name),
                        str,
                    ]);
                    window.app.error_handler.showError(srt_to_show, str);
                }
            },
        },
    },
    page_new: {
        mixins: [EditablePageMixin],
        computed: {
            /**
             * Redefinition of 'qs_url' from base mixin.
             */
            qs_url: function () {
                return this.url.replace('/new', '').replace(/^\/|\/$/g, '');
            },
            /**
             * Redefinition of 'title' from base mixin.
             */
            title: function () {
                return 'New ' + this.view.schema.name;
            },
        },
        methods: {
            /**
             * Redefinition of 'fetchData()' from base mixin.
             */
            fetchData() {
                this.initLoading();
                let qs = this.setAndGetQuerySetFromSandBox(this.view, this.qs_url);
                this.data.instance = qs.cache = qs.model.getInstance({}, qs);
                this.setLoadingSuccessful();
                this.getParentInstancesForPath();
            },
            /**
             * Redefinition of 'fetchData()' from editable_page_mixin.
             */
            setQuerySetInSandBox(view, url) {
                let qs = this.setQuerySet(view, url);
                let sandbox_qs = qs.copy();
                this.$store.commit('setQuerySetInSandBox', {
                    url: sandbox_qs.url,
                    queryset: sandbox_qs,
                });
            },
            /**
             * Method, that saves new Model instance.
             * Method gets new instance data, validates it and sends API request.
             */
            saveInstance() {
                let data = this.getValidData();

                if (!data) {
                    // the code line below is needed for tests.
                    current_view.setLoadingError({});
                    return;
                }

                this.loading = true;

                this.getQuerySetFromSandBox(this.view, this.qs_url)
                    .create(data)
                    .then((instance) => {
                        this.loading = false;
                        guiPopUp.success(
                            this.$t(pop_up_msg.instance.success.create).format([
                                this.$t(this.view.schema.name),
                            ]),
                        );
                        this.deleteQuerySetFromSandBox(this.qs_url);
                        this.openRedirectUrl({
                            path: this.getRedirectUrl({ instance: instance }),
                        });
                    })
                    .catch((error) => {
                        this.loading = false;

                        let str = window.app.error_handler.errorToString(error);

                        let srt_to_show = this.$t(pop_up_msg.instance.error.create).format([
                            this.$t(this.view.schema.name),
                            str,
                        ]);

                        window.app.error_handler.showError(srt_to_show, str);

                        // the code line below is needed for tests.
                        current_view.setLoadingError(error);
                    });
            },
            /**
             * Method, that forms redirect URL,
             * which will be opened after successful action execution.
             * @param {object} opt Object with arguments for current method.
             */
            getRedirectUrl(opt) {
                return [this.url.replace('/edit', '').replace('/new', ''), opt.instance.getPkValue()].join(
                    '/',
                );
            },
        },
    },
    page: {
        mixins: [PageWithDataMixin, ViewWithAutoUpdateMixin],
        methods: {
            async updateData() {
                this.data.instance = await this.getQuerySet(this.view, this.qs_url).get(false);
            },
            /**
             * Redefinition of 'fetchData()' from base mixin.
             */
            fetchData() {
                this.initLoading();
                // this.$store.dispatch(
                // {
                //     type: `${this.store_name}/fetchData`,
                //     view: this.view,
                //     url: this.url,
                //     many: false
                // }).then((instances) => {
                //     this.setLoadingSuccessful();
                //     if (this.view.schema.autoupdate) {
                //         this.startAutoUpdate();
                //     }
                // }).catch((error) => {
                //     this.setLoadingError(error);
                // })

                this.getInstance(this.view, this.qs_url)
                    .then((instance) => {
                        this.setLoadingSuccessful();
                        this.data.instance = instance;

                        if (this.view.schema.autoupdate) {
                            this.startAutoUpdate();
                        }
                    })
                    .catch((error) => {
                        this.setLoadingError(error);
                    });

                this.getParentInstancesForPath();
            },
            /**
             * Redefinition of 'getBreadcrumbNameForCurrentPath()' from base mixin.
             */
            getBreadcrumbNameForCurrentPath() {
                if (!isEmptyObject(this.datatype.data.instance) && this.datatype.data.instance.data) {
                    return this.data.instance.getViewFieldValue();
                }
            },
        },
    },
    page_edit: {
        mixins: [PageWithDataMixin, EditablePageMixin],
        computed: {
            /**
             * Redefinition of 'qs_url' from base mixin.
             */
            qs_url: function () {
                return this.url.replace('/edit', '').replace(/^\/|\/$/g, '');
            },
        },
        methods: {
            /**
             * Redefinition of 'fetchData()' from base mixin.
             */
            fetchData() {
                this.initLoading();
                this.setAndGetInstanceFromSandBox(this.view, this.qs_url)
                    .then((instance) => {
                        this.setLoadingSuccessful();
                        this.data.instance = instance;
                    })
                    .catch((error) => {
                        this.setLoadingError(error);
                    });

                this.getParentInstancesForPath();
            },
            /**
             * Method, that saves existing Model instance.
             * Method gets instance data, validates it and sends API request.
             */
            saveInstance() {
                let data = this.getValidData();
                if (!data) {
                    // the code line below is needed for tests.
                    current_view.setLoadingError({});
                    return;
                }
                let instance = this.data.instance;
                instance.data = data;
                this.loading = true;
                instance
                    .update({ method: this.view.schema.query_type })
                    .then((instance) => {
                        this.loading = false;
                        let qs = this.getQuerySet(this.view, this.qs_url).clone();
                        qs.cache = instance;
                        this.setQuerySet(this.view, this.qs_url, qs);

                        guiPopUp.success(
                            this.$t(pop_up_msg.instance.success.save).format([
                                instance.getViewFieldValue() || instance.getPkValue(),
                                this.view.schema.name,
                            ]),
                        );

                        this.openRedirectUrl({
                            path: this.getRedirectUrl({ instance: instance }),
                        });
                    })
                    .catch((error) => {
                        this.loading = false;
                        let str = window.app.error_handler.errorToString(error);

                        let srt_to_show = this.$t(pop_up_msg.instance.error.save).format([
                            instance.getViewFieldValue(),
                            this.$t(this.view.schema.name),
                            str,
                        ]);

                        window.app.error_handler.showError(srt_to_show, str);

                        // the code line below is needed for tests.
                        current_view.setLoadingError(error);
                    });
            },
            /**
             * Method, that resets 'page_edit' Instance data to the data of 'page' Instance view.
             * So this method resets changed data to the API data.
             */
            reloadInstance() {
                let base_qs = this.getQuerySet(this.view, this.qs_url);

                if (!(base_qs && base_qs.cache && base_qs.cache.data)) {
                    return;
                }

                this.$store.commit('setViewInstanceData', {
                    url: this.qs_url.replace(/^\/|\/$/g, ''),
                    data: base_qs.cache.data,
                    store: 'sandbox',
                });

                setTimeout(() => {
                    this.$store.commit('setViewInstanceData', {
                        url: this.qs_url.replace(/^\/|\/$/g, ''),
                        data: base_qs.cache.data,
                        store: 'sandbox',
                    });
                }, 10);
            },
            /**
             * Method, that forms redirect URL,
             * which will be opened after successful action execution.
             * @param {object} opt Object with arguments for current method.
             */
            // eslint-disable-next-line no-unused-vars
            getRedirectUrl(opt) {
                return this.url.replace('/edit', '');
            },
        },
    },
    action: {
        mixins: [EditablePageMixin],
        methods: {
            /**
             * Redefinition of 'fetchData()' from base mixin.
             */
            fetchData() {
                this.initLoading();
                let qs = this.setAndGetQuerySetFromSandBox(this.view, this.qs_url);
                this.data.instance = qs.cache = qs.model.getInstance({}, qs);
                this.setLoadingSuccessful();
                this.getParentInstancesForPath();
            },
            /**
             * Redefinition of 'fetchData()' from editable_page_mixin.
             */
            setQuerySetInSandBox(view, url) {
                let sandbox_qs = view.objects.clone({
                    url: url.replace(/^\/|\/$/g, ''),
                });
                this.$store.commit('setQuerySetInSandBox', {
                    url: sandbox_qs.url,
                    queryset: sandbox_qs,
                });
            },
            /**
             * Method, that forms redirect URL,
             * which will be opened after successful action execution.
             * @param {object} opt Object with arguments for current method.
             */
            getRedirectUrl(opt) {
                let r_data;
                if (opt.response && opt.response.data) {
                    r_data = opt.response.data;
                }

                if (!r_data) {
                    return this._getRedirectUrlBase(opt);
                }

                try {
                    let url = this._getRedirectUrlFromResponse(r_data);

                    if (url) {
                        return url;
                    }
                } catch (e) {
                    return this._getRedirectUrlBase(opt);
                }

                return this._getRedirectUrlBase(opt);
            },
            /**
             * Method, that forms redirect URL based on current url.
             * Method, returns URL of parent_instance from breadcrumbs.
             * @param {object} opt Object with arguments for current method.
             * @private
             */
            _getRedirectUrlBase(opt) {
                let parent_paths = this.getParentPaths(this.$route.name, this.url);
                let view = this.$store.getters.getView(parent_paths[parent_paths.length - 1].path);
                let instance = view.objects.model.getInstance(opt.data, view.objects);
                let url_parts = this.url.replace('/edit', '').replace('/new', '').split('/').slice(0, -2);
                url_parts.push(instance.getPkValue());
                return url_parts.join('/');
            },
            /**
             * Method, that executes action.
             * Method gets data from form, needed for action,
             * validates it and send API request for action execution.
             */
            async executeInstance() {
                let data = this.getValidData();
                if (!data) {
                    // the code line below is needed for tests.
                    current_view.setLoadingError({});
                    return;
                }
                let instance = this.data.instance;
                let method = this.view.schema.query_type;
                this.loading = true;
                try {
                    const response = await instance.queryset.execute({
                        method,
                        path: instance.queryset.getDataType(),
                        data: data,
                    });
                    this.loading = false;
                    guiPopUp.success(
                        this.$t(pop_up_msg.instance.success.execute).format([
                            this.$t(this.view.schema.name),
                            instance.name.toLowerCase(),
                        ]),
                    );
                    this.deleteQuerySetFromSandBox(this.qs_url);
                    this.openRedirectUrl({
                        path: this.getRedirectUrl({ data: response.data, response: response }),
                    });
                } catch (error) {
                    this.loading = false;
                    let str = window.app.error_handler.errorToString(error);

                    let srt_to_show = this.$t(pop_up_msg.instance.error.execute).format([
                        this.view.schema.name,
                        this.$t(instance.name.toLowerCase()),
                        str,
                    ]);

                    window.app.error_handler.showError(srt_to_show, str);

                    // the code line below is needed for tests.
                    current_view.setLoadingError({});
                }
            },
        },
    },
};

/**
 * Dict with mixins for Vue components for custom pages.
 */
export let customRoutesComponentsTemplates = {
    home: Home,
    '404': NotFound,
};
