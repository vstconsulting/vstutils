/**
 * View class - constructor, that returns view object.
 */
export default class View {
    /**
     * Constructor of View class.
     * @param {object} model Model, with which this view is connected.
     * @param {object} schema Options of current view,
     * that include settings for a view (internal links, view type and so on).
     * @param {string} template Id of script with template content.
     */
    constructor(model, schema, template) {
        let qs_constructor = this.constructor.getQuerySetConstructor(model);

        this.schema = schema;
        this.objects = new qs_constructor(model, this.schema.path);
        this.template = template;
        /**
         * Property, that stores extensions for components,
         * which would render current view.
         */
        this.mixins = [];
    }

    /**
     * Method, that handles view buttons (actions, operations, sublinks, child_links)
     * and returns them.
     * @param {string} type Buttons type - actions / operations /sublinks / child_links.
     * @param {object} buttons Object with buttons options.
     * @param {object} instance Model instance connected with current view.
     */
    getViewSublinkButtons(type, buttons, instance) { /* jshint unused: false */
        return buttons;
    }

    /**
     * Method returns string with template of route path for current view.
     * @param {string} path View path.
     * @return {string}
     */
    getPathTemplateForRouter(path="") {
        return path.replace(/\{/g, ":").replace(/\}/g, "");
    }

    /**
     * Method, that returns QuerySet constructor for view.
     * @param {object} model Model object.
     */
    static getQuerySetConstructor(model) {
        if(guiQuerySets[model.name + 'QuerySet']) {
            return guiQuerySets[model.name + 'QuerySet'];
        }

        return guiQuerySets.QuerySet;
    }
}