import {
    ACTION_STORE_MODULE,
    LIST_STORE_MODULE,
    PAGE_EDIT_STORE_MODULE,
    PAGE_NEW_STORE_MODULE,
    PAGE_STORE_MODULE,
} from '../store/components_state/commonStoreModules.js';
import ListViewComponent from '../components/list/ListViewComponent.vue';
import {
    ActionViewComponent,
    PageEditViewComponent,
    PageNewViewComponent,
    PageViewComponent,
} from '../components/page';
import { HttpMethods, joinPaths, pathToArray, ViewTypes } from '../utils';
export { ViewTypes };

/**
 * @typedef {Object} VisibleButton
 * @property {string} title
 * @property {Object} [styles] - Styles for button (https://vuejs.org/v2/guide/class-and-style.html#Object-Syntax-1)
 * @property {string[]} [classes]
 * @property {string[]} [iconClasses]
 * @property {boolean} [hidden]
 */

/**
 * @typedef {VisibleButton} Sublink
 * @property {string} name
 * @property {string} [href]
 * @property {string} [appendFragment]
 */

/**
 * Object that describes one action. Only empty action can be executed on multiple instances.
 * For empty action path and method are required.
 * For non empty action component or href must me provided.
 *
 * @typedef {VisibleButton} Action
 * @property {string} name
 * @property {boolean} isEmpty
 * @property {boolean} isMultiAction
 * @property {string|Object} [component]
 * @property {string} [href]
 * @property {path} [path]
 * @property {string} [method]
 * @property {boolean} [doNotShowOnList]
 */

/**
 * View class - constructor, that returns view object.
 */
export class View {
    static viewType = null;

    /**
     * @type {Map<string, Sublink>}
     */
    sublinks = new Map();
    /**
     * @type {Map<string, Action>}
     */
    actions = new Map();
    /**
     * @type {View|null}
     */
    parent = null;

    /**
     * Constructor of View class.
     * @param {Object} params
     * @param {QuerySet} objects
     * @param {Object[]} mixins
     */
    constructor(params, objects, mixins = []) {
        this.params = params;
        this.objects = objects;
        this.type = params.type || this.constructor.viewType;
        this.operationId = params.operationId;
        this.level = params.level;
        this.name = params.name;
        /** @type {string} */
        this.path = params.path;
        this.title = params.title || params.name;
        this.isDeepNested = params.isDeepNested;

        this.hidden = params['x-hidden'];

        /**
         * @type {Array<string>|null}
         */
        this.subscriptionLabels = params['x-subscribe-labels'] || null;

        /**
         * Property, that stores extensions for components,
         * which would render current view.
         */
        this.mixins = mixins;
    }

    /**
     * Property that returns array with request and response model
     * @return {Function[]}
     */
    get modelsList() {
        return [this.params.requestModel || null, this.params.responseModel || null];
    }

    /**
     * Returns custom store module
     * @returns {Object|undefined}
     */
    getStoreModule() {}
    /**
     * Method returns string with template of route path for current view.
     * @return {string}
     */
    getRoutePath() {
        return this.path.replace(/{/g, ':').replace(/}/g, '');
    }

    /**
     * Method that returns Vue component for view
     * @return {Object}
     */
    getComponent() {
        // If we provide `this` in `data` directly then `view` will become Vue component
        const thisView = this;
        return {
            mixins: this.mixins,
            provide() {
                return {
                    view: thisView,
                    pageComponent: this,
                };
            },
            data() {
                return { view: thisView };
            },
        };
    }

    /**
     * @param {Route} route
     * @returns {Object} component properties
     */
    _propsFunc(route) {
        const props = {
            query: { ...route.query },
            params: { ...route.params },
        };
        if (this.isDeepNested && (this.type === ViewTypes.PAGE || this.type === ViewTypes.PAGE_EDIT)) {
            props.params[this.objects.pathParams.at(-1).name] = route.params.pathMatch.split('/').at(-2);
        }
        return props;
    }

    /**
     * Method that returns route object for view (RouteConfig)
     * @return {Object}
     */
    toRoute() {
        return {
            name: this.path,
            path: this.getRoutePath(),
            component: this.getComponent(),
            props: this._propsFunc.bind(this),
            meta: {
                view: this,
            },
        };
    }
}

export class ListView extends View {
    static viewType = ViewTypes.LIST;

    /**
     * @type {Map<string, Action>}
     */
    multiActions = new Map();
    /**
     * @type {View|null}
     */
    pageView = null;
    /**
     * @type {QuerySet}
     */
    nestedQueryset = null;

    constructor(params, objects, mixins = [ListViewComponent]) {
        super(params, objects, mixins);
        /** @type {Object<String, BaseField>} */
        this.filters = params.filters;

        // Set deep nested related properties
        /** @type {string|null} */
        this.deepNestedViewFragment = params['x-deep-nested-view'] || null;
        /** @type {ListView|null} */
        this.deepNestedView = null;
        /** @type {ListView|null} */
        this.deepNestedParentView = null;
    }

    getRoutePath() {
        if (this.deepNestedParentView) {
            // Example: /category(/\\w+/categories)*/:id/categories/ | /category/1/categories/2/categories/
            return '{0}(/\\w+/{1})*/:{2}/{1}/'.format([
                this.deepNestedParentView.getRoutePath().replace(/\/$/, ''),
                this.deepNestedParentView.deepNestedViewFragment,
                this.deepNestedParentView.pageView.pkParamName,
            ]);
        }
        if (this.isDeepNested) {
            return joinPaths(this.parent.getRoutePath(), pathToArray(this.path).last);
        }
        return super.getRoutePath();
    }

    getStoreModule() {
        return LIST_STORE_MODULE;
    }
}

export class PageView extends View {
    static viewType = ViewTypes.PAGE;

    /**
     * @type {ListView}
     */
    listView = null;

    /**
     * @type {string}
     */
    pkParamName = null;

    constructor(params, objects, mixins = [PageViewComponent]) {
        super(params, objects, mixins);

        /** @type {boolean} */
        this.isFileResponse = params.isFileResponse;
    }

    getStoreModule() {
        return PAGE_STORE_MODULE;
    }

    getRoutePath() {
        const deepNestedParentView = this.listView?.deepNestedParentView;
        if (deepNestedParentView) {
            return '{0}(/\\w+/{1})+/:{2}/'.format([
                deepNestedParentView.getRoutePath().replace(/\/$/, ''),
                deepNestedParentView.deepNestedViewFragment,
                this.pkParamName,
            ]);
        }
        return super.getRoutePath();
    }
}

export class PageNewView extends View {
    static viewType = ViewTypes.PAGE_NEW;

    /**
     * @type {Map<string, Action>}
     */
    multiActions = new Map();
    /**
     * @type {ListView}
     */
    listView = null;

    constructor(params, objects, mixins = [PageNewViewComponent]) {
        super(params, objects, mixins);

        /**
         * Property flag indicates that nested view allowing append objects from shared view.
         */
        this.nestedAllowAppend = params['x-allow-append'];
    }

    getStoreModule() {
        return PAGE_NEW_STORE_MODULE;
    }

    getRoutePath() {
        if (this?.parent?.deepNestedParentView) {
            return joinPaths(this.parent.getRoutePath(), pathToArray(this.path).last);
        }
        return super.getRoutePath();
    }
}

export class PageEditView extends PageView {
    static viewType = ViewTypes.PAGE_EDIT;

    isEditStyleOnly = false;

    constructor(params, objects, mixins = [PageEditViewComponent]) {
        super(params, objects, mixins);

        /** @type {boolean} */
        this.isPartial = params.method === HttpMethods.PATCH;
    }

    getStoreModule() {
        return PAGE_EDIT_STORE_MODULE;
    }

    getRoutePath() {
        if (this?.parent?.parent?.deepNestedParentView) {
            return joinPaths(this.parent.getRoutePath(), pathToArray(this.path).last);
        }
        return super.getRoutePath();
    }
}

export class ActionView extends View {
    static viewType = ViewTypes.ACTION;

    constructor(params, objects, mixins = [ActionViewComponent]) {
        super(params, objects, mixins);

        this.method = params.method;
    }

    getStoreModule() {
        return ACTION_STORE_MODULE;
    }

    getRoutePath() {
        if (this?.parent?.parent?.deepNestedParentView) {
            return joinPaths(this.parent.getRoutePath(), pathToArray(this.path).last);
        }
        return super.getRoutePath();
    }
}
