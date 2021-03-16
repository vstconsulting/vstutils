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
import { HttpMethods, ViewTypes } from '../utils';
export { ViewTypes };

/**
 * @typedef {Object} VisibleButton
 * @property {string} title
 * @property {Object} [styles] - Styles for button (https://vuejs.org/v2/guide/class-and-style.html#Object-Syntax-1)
 * @property {string[]} [classes]
 * @property {string[]} [iconClasses]
 * @property {string[]} [titleClasses]
 */

/**
 * @typedef {VisibleButton} Sublink
 * @property {string} name
 * @property {string} [href]
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
     */
    constructor(params, objects, mixins = []) {
        this.params = params;
        this.objects = objects;
        this.type = params.type;
        this.operationId = params.operationId;
        this.level = params.level;
        this.name = params.name;
        this.path = params.path;
        this.title = params.title || params.name;

        this.hidden = false;

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
     * Returns custom store module
     * @returns {Object|undefined}
     */
    getStoreModule() {}

    /**
     * Method, that handles view buttons (actions, operations, sublinks, child_links)
     * and returns them.
     * @param {string} type Buttons type - actions / operations /sublinks / child_links.
     * @param {object} buttons Object with buttons options.
     * @param {object} instance Model instance connected with current view.
     */
    // eslint-disable-next-line no-unused-vars
    getViewSublinkButtons(type, buttons, instance) {
        return buttons;
    }

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
            provide: { view: thisView },
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
        return {
            query: { ...route.query },
            params: { ...route.params },
        };
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
            props: this._propsFunc,
        };
    }
}

export class ListView extends View {
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
        /**
         * @type {Object<String, BaseField>}
         */
        this.filters = params.filters;
    }

    getStoreModule() {
        return LIST_STORE_MODULE;
    }
}

export class PageView extends View {
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
}

export class PageNewView extends View {
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
}

export class PageEditView extends PageView {
    isEditStyleOnly = false;

    constructor(params, objects, mixins = [PageEditViewComponent]) {
        super(params, objects, mixins);

        /** @type {boolean} */
        this.isPartial = params.method === HttpMethods.PATCH;
    }

    getStoreModule() {
        return PAGE_EDIT_STORE_MODULE;
    }
}

export class ActionView extends View {
    constructor(params, objects, mixins = [ActionViewComponent]) {
        super(params, objects, mixins);

        this.model = params.model;
        this.method = params.method;
    }

    getStoreModule() {
        return ACTION_STORE_MODULE;
    }
}
