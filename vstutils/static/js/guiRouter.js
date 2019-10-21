/**
 * Class, that manages Router creation.
 * In current realization, Router is Vue-Router.
 * More about Vue-Router - https://router.vuejs.org/.
 */
class RouterConstructor { /* jshint unused: false */
    /**
     * Constructor of RouterConstructor Class.
     * @param {object} views Dict with views objects.
     * @param {object} components_templates Dict with mixins for Vue components,
     * generated for guiViews.
     * @param {object} custom_components_templates Dict with mixins for Vue components
     * of custom pages (home, 404 error page).
     */
    constructor(views, components_templates, custom_components_templates) {
        this.views = views;
        this.components_templates = components_templates;
        this.custom_components_templates = custom_components_templates;
        this.routes = [];
    }

    /**
     * Method, that returns Vue component for a route of current view type.
     * @param {object} view JS object, with options for a current view.
     * @return {object} Vue Component for a Route.
     */
    getRouteComponent(view) {
        return {
            mixins: this.getRouteComponentMixins(view),
            template: view.template,
            data: function () {
                return {
                    view: view,
                };
            },
        };
    }

    /**
     * Method, that collects appropriate mixins for a view Vue component into one array.
     * @param {object} view JS object, with options for a current view.
     * @return {array} Mixins Array for a Vue component.
     */
    getRouteComponentMixins(view) {
        return [
            this.components_templates.base,
            this.components_templates[view.schema.type],
        ].concat(view.mixins || []);
    }

    /**
     * Method, that forms array of possible routes of App.
     * @return {array} Routes Array.
     */
    getRoutes() {
        this.routes = [
            {
                name: 'home',
                path: '/',
                component: this.custom_components_templates.home || {},
            },
        ];

        for(let path in this.views){
            if(this.views.hasOwnProperty(path)) {
                this.routes.push({
                    name: path,
                    path: path.replace(/\{/g, ":").replace(/\}/g, ""),
                    component: this.getRouteComponent(this.views[path]),
                });
            }
        }

        for(let item in this.custom_components_templates) {
            if(this.custom_components_templates.hasOwnProperty(item)) {
                if (['home', '404'].includes(item)) {
                    continue;
                }

                this.routes.push({
                    name: item,
                    path: item.replace(/\{/g, ":").replace(/\}/g, ""),
                    component: this.custom_components_templates[item],
                });
            }
        }

        this.routes.push({
            name: '404',
            path: '*',
            component: this.custom_components_templates['404'] || {},
        });

        return this.routes;
    }

    /**
     * Method, that returns new instance of VueRouter.
     * @return {object} VueRouter.
     */
    getRouter() {
        return new VueRouter({ /* globals VueRouter */
            routes: this.getRoutes(),
        });
    }
}

/**
 * Mixin for all types of views(list, page, page_new, page_edit, action)
 * and custom views, like home page and 404 page.
 */
const the_basest_view_mixin = {
    data() {
        return {
            /**
             * Property, that manages of preloader showing.
             * If true, preloader will be showed. Otherwise, preloader will be hidden.
             */
            loading: false,
            /**
             * Error that occurs during fetchData() execution.
             */
            error: null,
            /**
             * Boolean property, that means, that fetchData() execution was successful.
             */
            response: null,
        };
    },
    created() {
        this.setDocumentTitle();
    },
    watch: {
        title() {
            this.setDocumentTitle();
        },
    },
    computed: {
        title() {
            return 'Default title';
        },
    },
    methods: {
        /**
         * Method, that goes to n's Browser History record.
         * @param {number} n Number of Browser History record to go.
         */
        goToHistoryRecord(n) {
            this.$router.go(n);
        },
        /**
         * Method, that sets <title></title> equal to this.title.
         */
        setDocumentTitle() {
            let title = this.$options.filters.capitalize(this.title);
            title = this.$options.filters.split(title);
            document.title = title;
        },
        /**
         * Method, that inits showing of preloader.
         */
        initLoading() {
            this.error = this.response = null;
            this.loading = true;

            // the code line below is needed for tests.
            current_view.initLoading();
        },
        /**
         * Method, that stops showing of preloader and shows view content.
         */
        setLoadingSuccessful() {
            this.loading = false;
            this.response = true;

            // the code line below is needed for tests.
            current_view.setLoadingSuccessful();
        },
        /**
         * Method, that stops showing of preloader and shows error.
         */
        setLoadingError(error) {
            this.loading = false;
            this.error = error;

            // the code line below is needed for tests.
            current_view.setLoadingError(error);
        },
    },
};

/**
 * Mixin for views of page type, that have some data from API to represent.
 */
const page_with_data_mixin = {
    computed: {
        /**
         * Redefinition of 'title' from base mixin.
         */
        title: function() {
            try {
                return this.data.instance.getViewFieldValue() || this.view.schema.name;
            } catch(e) {
                return this.view.schema.name;
            }
        },
    },
    methods: {
        /**
         * Method, that deletes:
         * - Model Instance;
         * - QuerySet of current view from main QS Store;
         * - QuerySet of current view from sandbox QS Store.
         * @return {promise}
         */
        removeInstance() {
            let instance = this.data.instance;
            instance.delete().then(response => {
                guiPopUp.success(pop_up_msg.instance.success.remove.format(
                    [instance.getViewFieldValue() || instance.getPkValue(), this.view.schema.name]
                ));
                this.deleteQuerySet(this.qs_url);
                this.deleteQuerySetFromSandBox(this.qs_url);
                this.openRedirectUrl({path: this.getRedirectUrl()});
            }).catch(error => {
                let str = app.error_handler.errorToString(error);

                let srt_to_show = pop_up_msg.instance.error.remove.format(
                    [instance.getViewFieldValue() || instance.getPkValue(), this.view.schema.name, str],
                );

                app.error_handler.showError(srt_to_show, str);

                debugger;
            });
        },
        /**
         * Method, that forms redirect URL,
         * which will be opened after successful action execution.
         * @param {object} opt Object with arguments for current method.
         */
        getRedirectUrl(opt) {
            return this.url.replace("/edit", "").replace("/new", "").split("/").slice(0, -1).join("/");
        },
    },
};

/**
 * Mixin for a views, that allows to edit data from API.
 */
const editable_page_mixin = {
    methods: {
        /**
         * Method, that creates copy of current view's QuerySet and save it in sandbox store.
         * Sandbox store is needed to have opportunity of:
         *  - instance editing;
         *  - saving previous instance data (in case, if user does not save his changes).
         * @param {object} view JS object, with options for a current view.
         * @param {string} url QuerySet URL.
         */
        setQuerySetInSandBox(view, url) {
            let page_view = view;

            try {
                page_view = this.$store.getters.getViews[view.schema.path.replace('/edit', '')];
            } catch(e) {}

            let qs = this.getQuerySet(page_view, url);
            let sandbox_qs;

            if(qs.model.name == view.objects.model.name) {
                sandbox_qs = qs.copy();
            } else {
                sandbox_qs = view.objects.clone({
                    use_prefetch: true,
                    url: url.replace(/^\/|\/$/g, ""),
                });
            }

            this.$store.commit('setQuerySetInSandBox', {
                url: sandbox_qs.url,
                queryset: sandbox_qs,
            });
        },

        /**
         * Method, that returns QuerySet object from sandbox store.
         * This QuerySet can be different from it's analog from objects store,
         * because it can contains user's changes.
         * @param {object} view JS object, with options for a current view.
         * @param {string} url QuerySet URL.
         * @return {object} QuerySet Object.
         */
        getQuerySetFromSandBox(view, url) {
            let qs = this.$store.getters.getQuerySetFromSandBox(url.replace(/^\/|\/$/g, ""));

            if(!qs) {
                this.setQuerySetInSandBox(view, url);
                return this.$store.getters.getQuerySetFromSandBox(url.replace(/^\/|\/$/g, ""));
            }

            return qs;
        },

        /**
         * Method, that returns QuerySet object from sandbox store,
         * that is equal to the QuerySet from objects store.
         * @param {object} view JS object, with options for a current view.
         * @param {string} url QuerySet URL.
         * @return {object} QuerySet Object.
         */
        setAndGetQuerySetFromSandBox(view, url) {
            this.setQuerySetInSandBox(view, url);
            return this.$store.getters.getQuerySetFromSandBox(url.replace(/^\/|\/$/g, ""));
        },

        /**
         * Method, that returns promise of getting Model instance from Sandbox QuerySet.
         * @param {object} view JS object, with options for a current view.
         * @param {string} url QuerySet URL.
         * @return {promise}
         */
        setAndGetInstanceFromSandBox(view, url) {
            return this.setAndGetQuerySetFromSandBox(view, url).get();
        },

        /**
         * Method, that returns validated data of Model instance.
         * @return {object} Validated data of model instance.
         */
        getValidData() {
            try {
                let valid_data = {};

                //////////////////////////////////////////////////////////////////
                // @todo
                // think about following 2 variables.
                // mb we should get data from data.instance.data, not from store,
                // so, data.instance.data should be reactive
                //////////////////////////////////////////////////////////////////
                let url = this.qs_url.replace(/^\/|\/$/g, "");
                let data = $.extend(true, {}, this.$store.getters.getViewInstanceData({
                    store: 'sandbox',
                    url: url,
                }));

                let toInnerData = {};

                for(let key in this.data.instance.fields) {
                    if(this.data.instance.fields.hasOwnProperty(key)) {
                        let field = this.data.instance.fields[key];

                        toInnerData[key] = field.toInner(data);
                    }
                }

                for(let key in this.data.instance.fields) {
                    if(this.data.instance.fields.hasOwnProperty(key)) {
                        let field = this.data.instance.fields[key];

                        if (field.options.readOnly) {
                            continue;
                        }

                        let value = field.validateValue(toInnerData);

                        if (value !== undefined && value !== null) {
                            valid_data[key] = value;
                        }
                    }
                }

                if(this.getValidDataAdditional) {
                    valid_data = this.getValidDataAdditional(valid_data);
                }

                return valid_data;
            } catch(e) {
                app.error_handler.defineErrorAndShow(e);
            }
        },
    }
};

/**
 * Mixin for views, that are able to send autoupdate requests.
 */
const view_with_autoupdate_mixin = {
    data() {
        return {
            /**
             * Property with options for autoupdate.
             */
            autoupdate: {
                /**
                 * Timeout ID, that setTimeout() function returns.
                 */
                timeout_id: undefined,
                /**
                 * Boolean property, that means "autoupdate was stopped or not".
                 */
                stop: false,
            },
        };
    },
    /**
     * Vue Hook, that is called,
     * when openning page has the same route path template as current one.
     */
    beforeRouteUpdate(to, from, next) {
        this.stopAutoUpdate();
        next();
    },
    /**
     * Vue Hook, that is called,
     * when openning page has different route path template from current one.
     */
    beforeRouteLeave(to, from, next) {
        this.stopAutoUpdate();
        this.$destroy();
        next();
    },
    methods: {
        /**
         * Method, that returns autoupdate interval for current view.
         */
        getAutoUpdateInterval() {
            return guiLocalSettings.get('page_update_interval') || 5000;
        },
        /**
         * Method, that starts sending Api request for data update.
         */
        startAutoUpdate() {
            let update_interval = this.getAutoUpdateInterval();
            this.autoupdate.stop = false;

            if(Visibility.state() == 'hidden') { /* globals Visibility */
                return setTimeout(() => {this.startAutoUpdate();}, update_interval);
            }

            this.autoupdate.timeout_id = setTimeout(() => {
                this.updateData().then(response => {
                    if(!this.autoupdate.stop) {
                        this.startAutoUpdate();
                    }
                });
            }, update_interval);
        },
        /**
         * Method, that stops sending Api request for data update.
         */
        stopAutoUpdate() {
            this.autoupdate.stop = true;
            clearTimeout(this.autoupdate.timeout_id);
        },
        /**
         * Method, that sends Api request for data update.
         */
        updateData() {
            let qs = this.getQuerySet(this.view, this.qs_url);
            let new_qs = this.getQuerySet(this.view, this.qs_url).clone();

            return new_qs.get().then(instance => {
                if(qs.cache.getPkValue() == instance.getPkValue()) {
                    for(let key in instance.data) {
                        if(instance.data.hasOwnProperty(key)) {
                            if (!deepEqual(instance.data[key], qs.cache.data[key])) {
                                qs.cache.data[key] = instance.data[key];
                            }
                        }
                    }
                    qs.cache.data = { ...qs.cache.data };

                }

                return true;
            }).catch(error => {
                debugger;
            });
        },
    }
};

/**
 * Mixin for Vue templates with card-boxes, that could be collapsed.
 */
const collapsable_card_mixin = {
    data() {
        return {
            /**
             * Boolean property, that is responsible for showing/hiding of card-box.
             */
            card_collapsed: false,
            /**
             * Boolean property, that is responsible for showing/hiding collapse-button.
             */
            card_collapsed_button: false,
        };
    },
    methods: {
        /**
         * Method, that toggles card_collapsed value.
         */
        toggleCardCollapsed() {
            this.card_collapsed = !this.card_collapsed;
        },
    },
};

/**
 * Object with properties of list views.
 */
let list_props = {
    page_size:20,
};

/**
 * Dict with mixins for Vue components, generated for guiViews.
 */
let routesComponentsTemplates = { /* jshint unused: false */
    /**
     * Base mixin - common mixin for all views types.
     */
    base: {
        mixins: [the_basest_view_mixin, collapsable_card_mixin],
        /**
         * Data property of Vue component.
         */
        data: function() {
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
                    store_url: this.qs_url.replace(/^\/|\/$/g, ""),
                };
            },
            /**
             * Name of component, that represents page's content body.
             */
            content_body_component: function() {
                return "gui_entity_" + this.view.schema.type;
            },
            /**
             * Name of component, that represents page's content header.
             */
            content_header_component: function() {
                return;
            },
            /**
             * Name of component, that represents page's content footer.
             */
            content_footer_component: function() {
                return;
            },
            /**
             * Component for additional content.
             */
            content_additional: function() {
                return;
            },
            /**
             * Title of View.
             */
            title: function() {
                return this.view.schema.name;
            },
            /**
             * Breadcrumbs of View.
             */
            breadcrumbs: function() {
                let breadcrumb = [{
                    name: "Home",
                    link: "/",
                }];

                return breadcrumb.concat(
                    this.getBreadcrumbParentPart(), this.getBreadcrumbCurrentPath(),
                );
            },
            /**
             * Current URL of view.
             */
            url: function() {
                return this.$route.path;
            },
            /**
             * Current URL of view's QuerySet.
             */
            qs_url: function() {
                return this.url;
            },
            /**
             * Property, that returns error data, if it exists.
             */
            error_data: function () {
                if(!this.error) {
                    return;
                }

                return app.error_handler.errorToString(this.error);
            },
        },
        /**
         * Vue Hook, that will be called after View Vue Component mount.
         */
        mounted(){
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
            '$route': 'fetchData'
        },
        /**
         * Dict with methods of current Vue component.
         */
        methods: {
            /**
             * Method, that opens some page.
             * @param {object} options Options for router for new page opening.
             */
            openPage(options={}) {
                this.$router.push(options);
            },
            /**
             * Method, that makes redirect to some page.
             * @param {object} options Options for router for redirect page opening.
             */
            openRedirectUrl(options={}) {
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
                if(this[method]){
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

                for(let key in response_data) {
                    if(key.indexOf("_id") !== -1) {
                        pk_key = key;
                        pk_value = response_data[key];
                    }
                }

                if(!pk_key) {
                    return;
                }

                // tries to find appropriate redirect path in internal paths
                let paths = Object.values(app.views).filter(item => {
                    if(item.schema.type == 'page' &&
                        item.schema.path.replace(/^\/|\/$/g, "").split("/").last == "{" + pk_key + "}") {
                        return item;
                    }
                }).map(item => item.schema.path);


                redirect_path = findClosestPath(paths, this.$route.name);

                if(redirect_path) {
                    let obj = {};

                    obj[pk_key] = pk_value;
                    return redirect_path.format($.extend(true, {}, this.$route.params, obj)).replace(/\/$/g, "");
                }

                // tries to find appropriate redirect path in paths of 3rd level
                redirect_path = Object.values(app.views).filter(item => {
                    if(item.schema.path.indexOf(pk_key.replace('_id','')) !== -1 &&
                        item.schema.type == 'page' && item.schema.level == 3) {
                        return item;
                    }
                }).map(item => item.schema.path)[0];

                if(redirect_path) {
                    let f_obj = {};

                    f_obj[path_pk_key] = pk_value;

                    return redirect_path.format(f_obj).replace(/\/$/g, "");
                }
            },

            /**
             * Method, that executes Empty action on instance.
             * @param {object} opt Object with properties for empty action execution.
             */
            executeEmptyActionOnInstance(opt={}) {
                let url = this._executeEmptyActionOnInstance_getUrl(opt);

                if(!url) {
                    return;
                }

                let method = opt.query_type || 'post';
                let qs = this.getQuerySet(this.view, this.qs_url).clone({url: url});

                qs.formQueryAndSend(method).then(response => {
                    guiPopUp.success(pop_up_msg.instance.success.execute.format(
                        [opt.name, this.view.schema.name]
                    ));

                    if(response && response.data) {
                        try {
                            let redirect_path = this._getRedirectUrlFromResponse(response.data);

                            if(redirect_path) {
                                this.openRedirectUrl({path: redirect_path});
                            }

                        } catch(e) {}
                    }

                }).catch(error => {
                    let str = app.error_handler.errorToString(error);

                    let srt_to_show = pop_up_msg.instance.error.execute.format(
                        [opt.name, this.view.schema.name, str],
                    );

                    app.error_handler.showError(srt_to_show, str);

                    debugger;
                });
            },
            /**
             * Method, returns url for empty action QuerySet.
             * @param {object} opt Object with properties for empty action execution.
             */
            _executeEmptyActionOnInstance_getUrl(opt={}) {
                if(!opt.path) {
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
            setQuerySet(view, url, qs) {
                if(!qs) {
                    qs = view.objects.copy();
                    qs.use_prefetch = true;
                }
                qs.url = url.replace(/^\/|\/$/g, "");
                this.$store.commit('setQuerySet', {
                    url: qs.url,
                    queryset: qs,
                });
                return this.getQuerySet(view, url);
            },
            /**
             * Method, that returns view's QuerySet from main QuerySet store.
             * @param {object} view JS object, with options for a current view.
             * @param {string} url QuerySet URL.
             * @return {object} QuerySet.
             */
            getQuerySet(view, url) {
                let qs = this.$store.getters.getQuerySet(url.replace(/^\/|\/$/g, ""));

                if(qs) {
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
                    url: url.replace(/^\/|\/$/g, ""),
                });
            },
            /**
             * Method, that deletes view's QuerySet from Sandbox QuerySet store.
             * @param {string} url QuerySet URL.
             */
            deleteQuerySetFromSandBox(url) {
                this.$store.commit('deleteQuerySetFromSandBox', {
                    url: url.replace(/^\/|\/$/g, ""),
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
             * @param {string} path Path of current view.
             * @param {string} url URL of current view.
             * @return {array}
             */
            getParentPaths(path, url){
                let result = [];
                let views = this.$store.getters.getViews;
                let inner_path = "/";
                let inner_url = "/";
                let path_parts = path.replace(/^\/|\/$/g, "").split("/");
                let url_parts = url.replace(/^\/|\/$/g, "").split("/");

                for(let i = 0; i < path_parts.length; i++) {
                    let test_path = inner_path + path_parts[i] + "/";
                    let test_url = inner_url + url_parts[i] + "/";

                    if(views[test_path]) {

                        if(test_path == this.$route.name){
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
            /**
             * Method, that loads parent model instances from current view url.
             * Method defines parents from URL, loads instances of those parents
             * and saves them in this.data.parent_instances.
             */
            getParentInstancesForPath() {
                let inner_paths = this.getParentPaths(this.$route.name, this.$route.path);
                let views = this.$store.getters.getViews;

                for(let index = 0; index < inner_paths.length; index++) {
                    let obj = inner_paths[index];

                    if(!this.loadParentInstanceOrNot(views, obj)) {
                        continue;
                    }

                    this.getInstance(views[obj.path], obj.url).then(instance => {
                        this.data.parent_instances[obj.url] = instance;
                        this.data.parent_instances = { ...this.data.parent_instances};
                    }).catch(error => {
                        debugger;
                    });
                }
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
                if(views[obj.path] && views[obj.path].schema.type == "list") {
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

                for(let index = 0; index < parent_links.length; index++) {
                    let parent_link = parent_links[index];
                    let name = parent_link.url.replace(/^\/|\/$/g, "").split("/").last;
                    let name_1;

                    if(this.data.parent_instances[parent_link.url]) {
                        name_1 = this.data.parent_instances[parent_link.url].getViewFieldValue();
                    }

                    breadcrumb.push({
                        name: name_1 || name,
                        link: parent_link.url.replace(/\/$/g, ""),
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

                let name = this.url.replace(/\/$/g, "").split("/").last;
                let name_1 = this.getBreadcrumbNameForCurrentPath();
                // variable for breadcrumb for last child part of current view path
                let current_bc = {
                    name: name_1 || name,
                };
                // if there is no filters and pagination, returns breadcrumbs
                if(isEmptyObject(this.$route.query)) {
                    breadcrumb.push(current_bc);
                    return breadcrumb;
                }

                current_bc.link = this.$route.path.replace(/\/$/g, "");
                breadcrumb.push(current_bc);

                // else defines filters and pagination
                let filters = [];
                let filters_keys = Object.keys(this.$route.query);
                let page = this.$route.query.page;

                if(page) {
                    filters_keys.splice(filters_keys.indexOf("page"), 1);
                }

                for(let index =0; index < filters_keys.length; index++) {
                    let key = filters_keys[index];
                    filters.push([key, this.$route.query[key]].join('='));
                }

                if(filters.length > 0) {
                    let obj = {
                        name: "search: " + filters.join("&"),
                    };

                    if(page) {
                        obj.link = this.$route.path.replace(/\/$/g, "") + "?" + filters.join("&");
                    }

                    breadcrumb.push(obj);
                }

                if(page) {
                    breadcrumb.push({
                        name: 'page=' + page,
                    });
                }

                return breadcrumb;
            }
        }
    },
    list: {
        mixins: [view_with_autoupdate_mixin],
        data: function() {
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
                 return "gui_entity_" + this.view.schema.type + "_footer";
            },
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

                this.setFilters(this.qs_url, this.generateBaseFilters());
                this.data.filters = this.getFilters(this.qs_url);

                let qs = this.setQuerySet(this.view, this.qs_url).filter(this.getFiltersPrepared(this.qs_url)).prefetch();
                this.setQuerySet(this.view, this.qs_url, qs);

                this.getInstancesList(this.view, this.qs_url).then(instances => {
                    this.setLoadingSuccessful();

                    this.setInstancesToData(instances);

                    if(this.view.schema.autoupdate) {
                        this.startAutoUpdate();
                    }

                }).catch(error => {
                    this.setLoadingError(error);
                });

                this.getParentInstancesForPath();
            },
            /**
             * Method, that sets instances to data.instances prop.
             * @param {array} instances Array with instances.
             */
            setInstancesToData(instances) {
                this.data.instances = instances;
                this.data.pagination.count = this.getQuerySet(this.view, this.qs_url).api_count;
                this.data.pagination.page_number = this.getFiltersPrepared(this.qs_url).page || 1;
            },

            /**
             * Method, that returns promise to get view model instances.
             * @param {object} view JS object, with options for a current view.
             * @param {string} url QuerySet URL.
             */
            getInstancesList(view, url) {
                return this.getQuerySet(view, url).items();
            },
            /**
             * Method, that creates object for saving info about
             * which instance in list was selected.
             * @param {string} url QuerySet URL.
             */
            setSelection(url) {
                url = url.replace(/^\/|\/$/g, "");
                if(!this.$store.getters.getSelections(url)) {
                    this.$store.commit('setSelection', url);
                }
            },
            /**
             * Method, that generates object
             * with values of base list QuerySet filters(limit, offset).
             * @return {object}
             */
            generateBaseFilters() {
                let limit = this.data.pagination.page_size;
                let page = this.$route.query.page || 1;
                let query = {
                    limit: limit,
                    offset: limit * (page - 1),
                };

                return $.extend(true, query, this.$route.query);
            },
            /**
             * Method, that saves object with values of QuerySet filters in store.
             * @param {string} url QuerySet URL.
             * @param {object} filters Values of QuerySet filters.
             * @return {object}
             */
            setFilters(url, filters) {
                url = url.replace(/^\/|\/$/g, "");
                this.$store.commit('setFilters', {
                    url: url,
                    filters: filters,
                });
            },
            /**
             * Method, that returns object with object,
             * that has values of QuerySet filters from store.
             * This object has specific structure (cache.data).
             * This was done to have opportunity of guiFields usage.
             * @param {string} url QuerySet URL.
             * @return {object}
             */
            getFilters(url) {
                return this.$store.getters.getFilters(url.replace(/^\/|\/$/g, ""));
            },
            /**
             * Method, that returns object with values of QuerySet filters from store.
             * @param {string} url QuerySet URL.
             * @return {object}
             */
            getFiltersPrepared(url) {
                let filters = this.getFilters(url).cache.data;

                for(let key in filters) {
                    if(filters.hasOwnProperty(key) && filters[key] === undefined) {
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
                let filters = this.getFiltersPrepared(this.qs_url);

                for(let filter in filters) {
                    if(hidden_filters.includes(filter)){
                        delete filters[filter];
                    }
                }

                this.openPage({
                    name: this.$route.name,
                    params: this.$route.params,
                    query: filters,
                });
            },
            /**
             * Method, that deletes one instance from list:
             * - Model Instance;
             * - QuerySet of current view from main QS Store;
             * - QuerySet of current view from sandbox QS Store.
             * @return {promise}
             */
            removeInstance(opt) {
                let instance;
                for(let index = 0; index < this.data.instances.length; index++) {
                    instance = this.data.instances[index];

                    if(instance.getPkValue() == opt.instance_id) {
                        break;
                    }
                }

                if(!instance) {
                    return;
                }

                instance.delete().then(response => {
                    this.removeInstances_callback(instance, response);
                }).catch(error => {
                    let str = app.error_handler.errorToString(error);

                    let srt_to_show = pop_up_msg.instance.error.remove.format(
                        [instance.getViewFieldValue(), this.view.schema.name, str],
                    );

                    app.error_handler.showError(srt_to_show, str);

                    debugger;
                });
            },
            /**
             * Method, that removes instances from list.
             */
            removeInstances() {
                let selections = this.$store.getters.getSelections(
                    this.qs_url.replace(/^\/|\/$/g, ""),
                );

                for(let id in selections) {
                    if(!selections[id]) { continue; }
                    for(let index = 0; index < this.data.instances.length; index++) {
                        let instance = this.data.instances[index];
                        if(id == instance.getPkValue()){
                            instance.delete().then(response => {
                                this.removeInstances_callback(instance, response);
                            }).catch(error => {
                                let str = app.error_handler.errorToString(error);

                                let srt_to_show = pop_up_msg.instance.error.remove.format(
                                    [instance.getViewFieldValue(), this.view.schema.name, str],
                                );

                                app.error_handler.showError(srt_to_show, str);

                                debugger;
                            });
                        }
                    }
                }
            },
            /**
             * Callback on successful instance remove from instances list.
             * @param {object} instance Instance, tht was removed in API.
             * @param {object} response API response.
             */
            removeInstances_callback(instance, response) {
                guiPopUp.success(pop_up_msg.instance.success.remove.format(
                    [instance.getViewFieldValue() || instance.getPkValue(), this.view.schema.name]
                ));

                let url = this.qs_url.replace(/^\/|\/$/g, "") + "/" +
                    instance.getPkValue();

                this.deleteQuerySet(url);

                let ids = {};

                ids[instance.getPkValue()] = false;

                this.$store.commit('setSelectionValuesByIds', {
                    url: this.qs_url.replace(/^\/|\/$/g, ""),
                    ids: ids,
                });

                let new_qs = this.getQuerySet(this.view, this.qs_url).copy();

                if(!new_qs.cache) {
                    return;
                }

                for(let index =0; index < new_qs.cache.length; index++) {
                    let list_instance = new_qs.cache[index];

                    if(list_instance.getPkValue() == instance.getPkValue()) {
                        new_qs.cache.splice(index, 1);

                        this.setQuerySet(this.view, this.qs_url, new_qs);

                        this.getInstancesList(this.view, this.qs_url).then(instances => {
                            this.setInstancesToData(instances);
                        });
                    }
                }
            },
            /**
             * Redefinition of 'updateData()' method from view_with_autoupdate_mixin.
             */
            updateData() {
                let new_qs = this.getQuerySet(this.view, this.qs_url).clone().prefetch();
                return new_qs.items().then(instances => {
                    if(deepEqual(this.getQuerySet(this.view, this.qs_url).query, new_qs.query)) {
                        this.setQuerySet(this.view, this.qs_url, new_qs);

                        this.setInstancesToData(instances);

                        return true;
                    } else {
                        return false;
                    }
                }).catch(error => {
                    debugger;
                });
            },
            /**
             * Redefinition of base '_executeEmptyActionOnInstance_getUrl' method.
             * @param {object} opt Object with properties for empty action execution.
             */
            _executeEmptyActionOnInstance_getUrl(opt={}) {
                if(!opt.instance_id) {
                    return;
                }

                return this.$route.path.replace(/\/$/g, "") + "/" +
                    opt.instance_id + "/" + opt.name + "/";
            },
            /**
             * Method, that adds child instance to parent list.
             * @param {object} opt
             */
            addChildInstance(opt) {
                let qs = this.getQuerySet(this.view, this.qs_url).clone();
                qs.query = {};
                qs.formQueryAndSend('post', opt.data).then(response => {
                    guiPopUp.success(pop_up_msg.instance.success.add.format(
                        [this.view.schema.name],
                    ));
                }).catch(error => {
                    let str = app.error_handler.errorToString(error);

                    let srt_to_show = pop_up_msg.instance.error.add.format(
                        [this.view.schema.name, str],
                    );

                    app.error_handler.showError(srt_to_show, str);

                    debugger;
                });
            },
        },
    },
    page_new: {
        mixins: [editable_page_mixin],
        computed: {
            /**
             * Redefinition of 'qs_url' from base mixin.
             */
            qs_url: function() {
                return this.url.replace("/new", "");
            },
            /**
             * Redefinition of 'title' from base mixin.
             */
            title: function() {
                return "New " + this.view.schema.name;
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

                if(!data) {
                    // the code line below is needed for tests.
                    current_view.setLoadingError({});
                    return;
                }

                let qs = this.getQuerySetFromSandBox(this.view, this.qs_url).clone();

                let instance = qs.model.getInstance(data, qs);

                let method = this.view.schema.query_type;

                this.loading = true;

                instance.save(method).then(instance => {
                    this.loading = false;
                    guiPopUp.success(pop_up_msg.instance.success.create.format(
                        [this.view.schema.name],
                    ));
                    this.deleteQuerySetFromSandBox(this.qs_url);
                    this.openRedirectUrl({path: this.getRedirectUrl({instance: instance})});
                }).catch(error => {
                    this.loading = false;

                    let str = app.error_handler.errorToString(error);

                    let srt_to_show = pop_up_msg.instance.error.create.format(
                        [this.view.schema.name, str],
                    );

                    app.error_handler.showError(srt_to_show, str);

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
                return [this.url.replace('/edit','').replace('/new', ''), opt.instance.getPkValue()].join("/");
            },
        },
    },
    page: {
        mixins: [page_with_data_mixin, view_with_autoupdate_mixin],
        methods: {
            /**
             * Redefinition of 'fetchData()' from base mixin.
             */
            fetchData() {
                this.initLoading();
                this.getInstance(this.view, this.qs_url).then(instance => {
                    this.setLoadingSuccessful();
                    this.data.instance = instance;

                    if(this.view.schema.autoupdate) {
                        this.startAutoUpdate();
                    }
                }).catch(error => {
                    debugger;
                    this.setLoadingError(error);
                });

                this.getParentInstancesForPath();
            },
            /**
             * Redefinition of 'getBreadcrumbNameForCurrentPath()' from base mixin.
             */
            getBreadcrumbNameForCurrentPath() {
                if(!isEmptyObject(this.data.instance) && this.data.instance.data) {
                    return this.data.instance.getViewFieldValue();
                }
            },
        },
    },
    page_edit: {
        mixins: [page_with_data_mixin, editable_page_mixin],
        computed: {
            /**
             * Redefinition of 'qs_url' from base mixin.
             */
            qs_url: function() {
                return this.url.replace("/edit", "");
            },
        },
        methods: {
            /**
             * Redefinition of 'fetchData()' from base mixin.
             */
            fetchData() {
                this.initLoading();
                this.setAndGetInstanceFromSandBox(this.view, this.qs_url).then(instance => {
                    this.setLoadingSuccessful();
                    this.data.instance = instance;
                }).catch(error => {
                    this.setLoadingError(error);
                    debugger;
                });

                this.getParentInstancesForPath();
            },
            /**
             * Method, that saves existing Model instance.
             * Method gets instance data, validates it and sends API request.
             */
            saveInstance() {
                let data = this.getValidData();
                if(!data) {
                    // the code line below is needed for tests.
                    current_view.setLoadingError({});
                    return;
                }
                let instance = this.data.instance;
                instance.data = data;
                let method = this.view.schema.query_type;
                this.loading = true;
                instance.save(method).then(instance => {
                    this.loading = false;
                    let qs = this.getQuerySet(this.view, this.qs_url).clone();
                    qs.cache = instance;
                    this.setQuerySet(this.view, this.qs_url, qs);

                    guiPopUp.success(pop_up_msg.instance.success.save.format(
                        [instance.getViewFieldValue() || instance.getPkValue(), this.view.schema.name],
                    ));

                    this.openRedirectUrl({path: this.getRedirectUrl({instance:instance})});
                }).catch(error => {
                    this.loading = false;
                    let str = app.error_handler.errorToString(error);

                    let srt_to_show = pop_up_msg.instance.error.save.format(
                        [instance.getViewFieldValue(), this.view.schema.name, str],
                    );

                    app.error_handler.showError(srt_to_show, str);

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

                if(!(base_qs && base_qs.cache && base_qs.cache.data)) {
                    return;
                }

                this.$store.commit('setViewInstanceData', {
                    url: this.qs_url.replace(/^\/|\/$/g, ""),
                    data: base_qs.cache.data,
                    store: 'sandbox',
                });

                setTimeout(() => {
                    this.$store.commit('setViewInstanceData', {
                        url: this.qs_url.replace(/^\/|\/$/g, ""),
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
            getRedirectUrl(opt) {
                return this.url.replace("/edit", "");
            },
        },
    },
    action: {
        mixins: [editable_page_mixin],
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
                let sandbox_qs = view.objects.clone({url: url.replace(/^\/|\/$/g, "")});
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
            getRedirectUrl(opt){
                let r_data;
                if(opt.response && opt.response.data) {
                    r_data = opt.response.data;
                }

                if(!r_data) {
                    return this._getRedirectUrlBase(opt);
                }

                try {
                    let url = this._getRedirectUrlFromResponse(r_data);

                    if(url) {
                        return url;
                    }

                } catch(e) {
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
                let url_parts = this.url.replace("/edit", "").replace("/new", "").split("/").slice(0, -2);
                url_parts.push(instance.getPkValue());
                return url_parts.join("/");
            },
            /**
             * Method, that executes action.
             * Method gets data from form, needed for action,
             * validates it and send API request for action execution.
             */
            executeInstance() {
                let data = this.getValidData();
                if(!data) {
                    // the code line below is needed for tests.
                    current_view.setLoadingError({});
                    return;
                }
                let instance = this.data.instance;
                let method = this.view.schema.query_type;
                this.loading = true;
                instance.queryset.formQueryAndSend(method, data).then(response => {
                    this.loading = false;
                    guiPopUp.success(pop_up_msg.instance.success.execute.format(
                        [this.view.schema.name, instance.name.toLowerCase()]
                    ));
                    this.deleteQuerySetFromSandBox(this.qs_url);
                    let data = response.data;
                    this.openRedirectUrl({path: this.getRedirectUrl({data: data, response: response})});
                }).catch(error => {
                    this.loading = false;
                    let str = app.error_handler.errorToString(error);

                    let srt_to_show = pop_up_msg.instance.error.execute.format(
                        [this.view.schema.name, instance.name.toLowerCase(), str],
                    );

                    app.error_handler.showError(srt_to_show, str);

                    // the code line below is needed for tests.
                    current_view.setLoadingError({});
                });
            },
        }
    },
};

/**
 * Dict with mixins for Vue components for custom pages.
 */
let customRoutesComponentsTemplates = { /* jshint unused: false */
    home: {
        mixins: [the_basest_view_mixin],
        template: "#template_custom_view",
        data() {
            return {
                message: "Homepage content"
            };
        },
        computed: {
            title() {
                return 'Home';
            }
        },
    },
    '404': {
        mixins: [the_basest_view_mixin],
        template: "#template_custom_view",
        data() {
            return {
                message: "Page with current URL was not found."
            };
        },
        computed: {
            title() {
                return 'Error 404';
            }
        },
    },
};