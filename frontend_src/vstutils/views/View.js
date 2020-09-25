import { guiQuerySets } from '../querySet';
import {
    ACTION_STORE_MODULE,
    LIST_STORE_MODULE,
    PAGE_EDIT_STORE_MODULE,
    PAGE_NEW_STORE_MODULE,
    PAGE_STORE_MODULE,
} from '../store/components_state/commonStoreModules.js';

/**
 * View class - constructor, that returns view object.
 */
export default class View {
    /**
     * Constructor of View class.
     *
     * @param {object} model Model, with which this view is connected.
     * @param {object} schema Options of current view,
     * that include settings for a view (internal links, view type and so on).
     * @param mixins {Array.<Object>} Vue mixins for view component
     */
    constructor(model, schema, mixins = []) {
        let qs_constructor = this.constructor.getQuerySetConstructor(model);

        this.schema = schema;
        this.objects = new qs_constructor(model, this.schema.path, {}, schema.type === 'list');
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
    getStoreModule() {
        switch (this.schema.type) {
            case 'list':
                return LIST_STORE_MODULE;
            case 'page':
                return PAGE_STORE_MODULE;
            case 'page_new':
                return PAGE_NEW_STORE_MODULE;
            case 'page_edit':
                return PAGE_EDIT_STORE_MODULE;
            case 'action':
                return ACTION_STORE_MODULE;
        }
    }

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
     * @param {string} path View path.
     * @return {string}
     */
    getPathTemplateForRouter(path = '') {
        return path.replace(/{/g, ':').replace(/}/g, '');
    }

    /**
     * Method, that returns QuerySet constructor for view.
     * @param {object} model Model object.
     */
    static getQuerySetConstructor(model) {
        if (guiQuerySets[model.name + 'QuerySet']) {
            return guiQuerySets[model.name + 'QuerySet'];
        }

        return guiQuerySets.QuerySet;
    }
}
