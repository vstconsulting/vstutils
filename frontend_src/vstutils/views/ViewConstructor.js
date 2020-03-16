/**
 * Class, that manages creation of guiViews.
 */
export default class ViewConstructor extends BaseEntityConstructor {
    /**
     * Constructor of ViewConstructor class.
     * @param {object} openapi_dictionary Dict, that has info about properties names in OpenApi Schema
     * and some settings for views of different types.
     * @param {object} models Dict with Models.
     */
    constructor(openapi_dictionary, models) {
        super(openapi_dictionary);
        this.models = models;
    }

    /**
     * Method, that returns paths list from OpenApi Schema.
     * @param {object} openapi_schema OpenApi Schema.
     */
    getPaths(openapi_schema) {
        return openapi_schema[this.dictionary.paths.name];
    }

    /**
     * Method, that returns operation_id property of current path type object (path_obj_prop).
     * @param {object} path_obj_prop Property of path object, from OpenApi's path dict.
     */
    getPathOperationId(path_obj_prop) {
        return path_obj_prop[this.dictionary.paths.operation_id.name];
    }

    /**
     * Method, that returns Array with views types,
     * to which ViewConstructor should always add operations from dictionary.
     */
    getTypesOperationAlwaysToAdd() {
        return this.dictionary.paths.types_operations_always_to_add;
    }

    /**
     * Method, that returns path's name.
     * @param {string} path Key of path object, from OpenApi's path dict.
     */
    getViewSchema_name(path) {
        let path_parths = path.replace(/\/{[A-z]+}/g, "").split(/\//g);
        return path_parths[path_parths.length - 2];
    }

    /**
     * Method, that returns base options of view schema.
     * @param {string} path Key of path object, from OpenApi's path dict.
     */
    getViewSchema_baseOptions(path) {
        return {
            name: this.getViewSchema_name(path),
            level: (path.match(/\//g) || []).length,
        };
    }

    /**
     * Method, that returns object with filters for current path.
     * @param {object} operation_id_filters Filters property from operation_id_options.
     * @param {object} path_obj_prop Property of path object, from OpenApi's path dict.
     */
    getViewSchema_filters(operation_id_filters, path_obj_prop) {
        let filters = $.extend(true, {}, path_obj_prop[operation_id_filters.name]);
        for(let filter in filters) {
            if(this.dictionary.models.filters_to_delete.includes(filters[filter].name)) {
                delete filters[filter];
            }
        }
        return filters;
    }

    /**
     * Method, that generates new guiField objects for View filters.
     * @param {object} operation_id_filters Filters property from operation_id_options.
     * @param {object} path_obj_prop Property of path object, from OpenApi's path dict.
     * @param {string} path View path.
     */
    generateViewSchemaFilters(operation_id_filters, path_obj_prop, path) {
        let f_obj = {};
        let filters = this.getViewSchema_filters(operation_id_filters, path_obj_prop);

        tabSignal.emit("views[" + path + "].filters.beforeInit", filters);

        for(let filter in filters) {
            if(filters.hasOwnProperty(filter)) {
                let format = this.getFilterFormat(filters[filter]);
                let opt = {format: format};

                f_obj[filters[filter].name] = new guiFields[format](
                    $.extend(true, {}, filters[filter], opt)
                );
            }
        }

        tabSignal.emit("views[" + path + "].filters.afterInit", filters);

        return f_obj;
    }

    /**
     * Method, that defined format for filter's guiField object.
     * @param {object} filter Object with filter options (object from View schema).
     */
    getFilterFormat(filter) {
        return this.getFieldFormat(filter);
    }


    /**
     * Method, that return operation_id options for view schema.
     * It gets operation_id options from openapi_dictionary and sets them.
     * @param {string} operation_id  Operation_id value.
     * @param {string} path Key of path object, from OpenApi's path dict.
     * @param {object} path_obj_prop Property of path object, from OpenApi's path dict.
     * @return {object} operation_id_options Operation_id options for view schema.
     */
    getViewSchema_operationIdOptions(operation_id, path, path_obj_prop) {
        let opt = {
            operation_id: operation_id,
        };

        for(let item in this.dictionary.schema_types){
            if(this.dictionary.schema_types.hasOwnProperty(item)) {
                if (operation_id.indexOf(item) == -1) {
                    continue;
                }
                opt = $.extend(true, opt, this.dictionary.schema_types[item]);
                opt.path = path + opt.url_postfix;
                delete opt.url_postfix;
                if (opt.filters) {
                    opt.filters = this.generateViewSchemaFilters(
                        opt.filters, path_obj_prop, opt.path,
                    );
                }
                return opt;
            }
        }

        return $.extend(true, opt, { query_type: "post", path: path, type: 'action'});
    }

    /**
     * Method, that recursively finds link to Model name for current path type object (path_obj_prop).
     * @param {object} obj property of path object, from OpenApi's path dict, for which method should find Model name.
     * @param {number} max_level Max level of inner recursion.
     * @param {number} level Current level of recursion.
     */
    getModelNameLink(obj, max_level=0, level=0) {
        if(!obj) {
            return;
        }

        if(max_level && max_level <= level) {
            return;
        }

        if(typeof obj == 'string') {
            let name = obj.match(/\/([A-z0-9]+)$/);
            if(name && name[1]) {
                return obj;
            }
            return;
        }

        if(typeof obj != 'object') {
            return;
        }

        for(let prop in obj) {
            if(obj.hasOwnProperty(prop)) {
                if (this.dictionary.models.ref_names.includes(prop)) {
                    let name = obj[prop].match(/\/([A-z0-9]+)$/);
                    if (name && name[1]) {
                        return obj[prop];
                    }
                }

                if (typeof obj[prop] == 'object') {
                    let api_obj = this.getModelNameLink(obj[prop], max_level, level + 1);
                    if (api_obj) {
                        return api_obj;
                    }
                }
            }
        }
    }

    /**
     * Method, that returns name of Model, connected with current path type object (path_obj_prop).
     * @param {object} path_obj_prop Property of path object, from OpenApi's path dict.
     */
    getModelName(path_obj_prop) {
        let model_link = this.getModelNameLink(path_obj_prop);
        let model_name = model_link.split("/");
        return model_name[model_name.length - 1];
    }

    /**
     * Method, that returns Model, connected with current path type object (path_obj_prop).
     * @param {object} path_obj_prop Property of path object, from OpenApi's path dict.
     */
    getViewSchema_model(path_obj_prop) {
        let model_name = this.getModelName(path_obj_prop);
        return this.models[model_name];
    }

    /**
     * Method, that returns template for a current view schema.
     * @param {object} schema View schema.
     */
    getViewTemplate(schema) {
        let template;
        let base = "#template_view_";

        ["entity", schema.name].forEach(item => {
            if($(base + item).length > 0){
                template = base + item;
            }
        });

        return template;
    }

    /**
     * Method, that creates views based on OpenApi schema.
     * @param {class} constructor View class - constructor, that returns View object.
     * @param {object} openapi_schema OpenApi Schema.
     * @return {object} views Dict of views objects.
     */
    getViews(constructor, openapi_schema) {
        let views = {};
        let paths = this.getPaths(openapi_schema);

        for(let path in paths){
            if(paths.hasOwnProperty(path)) {
                let path_obj = paths[path];
                let base_options = this.getViewSchema_baseOptions(path);

                for (let prop in path_obj) {
                    if(path_obj.hasOwnProperty(prop)) {
                        let operation_id = this.getPathOperationId(path_obj[prop]);

                        if (!operation_id) {
                            continue;
                        }

                        let operation_id_options = this.getViewSchema_operationIdOptions(operation_id, path, path_obj[prop]);

                        if (views[operation_id_options.path]) {
                            continue;
                        }

                        let schema = $.extend(true, {}, base_options, operation_id_options);
                        let model = this.getViewSchema_model(path_obj[prop]);
                        let template = this.getViewTemplate(schema);

                        tabSignal.emit("views[" + schema.path + "].beforeInit", {
                            schema: schema,
                            model: model,
                            template: template,
                        });

                        views[schema.path] = new constructor(model, schema, template);

                        tabSignal.emit("views[" + schema.path + "].afterInit", {
                            view: views[schema.path],
                        });
                    }
                }
            }
        }

        tabSignal.emit("allViews.inited", {views: views});

        return views;
    }

    /**
     * Method, that checks: is current link an operation for this path_obj.
     * @param {string} name Name of a link obj.
     * @param {object} path_obj View object of a path, for which internal links are setting.
     * @return {boolean} bool True, if link is operation for this path_obj, otherwise - false.
     */
    internalLinkIsOperation(name, path_obj) {
        let bool = false;
        ['base', path_obj.schema.type].forEach(type => {
            if(this.dictionary.paths.operations[type] &&
                this.dictionary.paths.operations[type][name]){
                bool = true;
            }
        });
        return bool;
    }

    /**
     * Method, that returns extension from opeanapi_dictionary for current link obj.
     * @param {string} link_name Name of a link.
     * @param {string} link_type Type of link object (child_links, actions, operations, sublinks).
     * @param {object} path_obj View object for a path (object FROM which link wll be formed).
     */
    getInternalLinkObj_extension(link_name, link_type, path_obj) {
        let obj = {};
        let dict = this.dictionary.paths;
        ['base', path_obj.schema.type].forEach(path_type => {
            if(dict && dict[link_type] && dict[link_type][path_type] && dict[link_type][path_type][link_name]){
                obj = $.extend(true, obj, dict[link_type][path_type][link_name]);
            }
        });
        return obj;
    }

    /**
     * Method, that defines emptiness of path_obj.
     * @param {object} path_obj View object for a link path.
     * @returns {boolean}
     */
    isPathObjSchemaEmpty(path_obj) {
        if(path_obj.schema.empty) {
            return true;
        }

        return isEmptyObject(path_obj.objects.model.fields);
    }

    /**
     * Method, that returns object for a current link.
     * @param {string} link_name Name of a link.
     * @param {string} link_type Type of link object (child_links, actions, operations, sublinks).
     * @param {string} link Real path of link_obj.
     * @param {object} link_obj View object for a link (object TO which link will be formed).
     * @param {object} path_obj View object for a path (object FROM which link wll be formed).
     */
    getInternalLinkObj(link_name, link_type, link, link_obj, path_obj) {
        let obj = {
            name: link_name,
        };

        if(!(link_obj.schema.hidden) && link) {
            obj.path = link;
        }

        if(this.isPathObjSchemaEmpty(link_obj)) {
            obj.empty = true;
            obj.query_type = link_obj.schema.query_type;
        }

        obj = $.extend(
            true, obj, this.getInternalLinkObj_extension(link_name, link_type, path_obj),
        );

        return obj;
    }

    /**
     * Method, that finds and returns internal links(links for another views) for a current view.
     * @param {object} views Dict with view objects.
     * @param {string} path Path of current view.
     * @return {object} Links - dict with links objects.
     */
    getViewInternalLinks(views, path) {
        let links = {
            actions: {},
            operations: {},
            sublinks: {},
            child_links: {},
        };

        for(let link in views){
            if(views.hasOwnProperty(link)) {
                if(views[link].schema.do_not_connect_with_another_views) {
                    continue;
                }

                if (link == path) {
                    continue;
                }

                if (link.indexOf(path) != 0) {
                    continue;
                }

                let link_name = link.match(/\/([A-z0-9]+)\/$/);

                if (!link_name) {
                    continue;
                }

                link_name = link_name[1];

                let dif = link.match(/\//g).length - path.match(/\//g).length;
                let link_type;

                if (dif > 2) {
                    continue;
                }

                if (dif == 2) {
                    // if(this.internalLinkIsOperation(link_name, views[path])){
                    //     continue;
                    // }
                    link_type = 'child_links';
                } else {
                    if (views[link].schema.type == 'action') {
                        link_type = 'actions';
                    } else if (this.internalLinkIsOperation(link_name, views[path])) {
                        link_type = 'operations';
                    } else {
                        link_type = 'sublinks';
                    }
                }

                if (link_type) {
                    links[link_type][link_name] = this.getInternalLinkObj(link_name, link_type, link, views[link], views[path]);
                }
            }
        }

        // adds required links, that were not added before
        let types_to_add = this.getTypesOperationAlwaysToAdd();
        if(types_to_add.includes(views[path].schema.type)) {
            let dict = this.dictionary.paths;
            let path_type = views[path].schema.type;

            Object.keys(links).forEach(link_type => {
                if(dict && dict[link_type] && dict[link_type][path_type]) {
                    for(let link in dict[link_type][path_type]) {
                        if(dict[link_type][path_type].hasOwnProperty(link)) {
                            if (links[link_type][link]) {
                                continue;
                            }

                            links[link_type][link] = dict[link_type][path_type][link];
                        }
                    }
                }
            });
        }

        if(views[path].schema.type == "list" && views[path].schema.level > 2 &&
            views["/" + views[path].schema.name + "/"]) {
            let dict = this.dictionary.paths;
            let list_op;

            if(dict && dict.operations && dict.operations.list) {
                list_op = dict.operations.list;

                //@todo add the nearest way.
                let opt = {
                    list_paths: ["/" + views[path].schema.name + "/"],
                };
                links.operations.add = $.extend(true, {}, list_op.add, opt);
            }
        }

        return links;
    }

    /**
     * Method, that finds and returns multi_actions for a current view.
     * Multi_actions - actions/operations, that can be called for a list of instances.
     * @param {object} views Dict with view objects.
     * @param {string} path Path of current view.
     * @return {object} multi_actions Dict with multi_actions objects.
     */
    getViewMultiActions(views, path) {
        let multi_actions = {};
        let dict = this.dictionary.paths;
        let list = views[path];
        if(!list.schema.page_path) {
            return;
        }
        let page = views[list.schema.page_path];
        ['actions', 'operations'].forEach(op_type => {
            if(!page.schema[op_type]) {
                return;
            }
            for(let item in page.schema[op_type]){
                if(dict && dict.multi_actions && dict.multi_actions.includes(item)){
                    multi_actions[item] = $.extend(true, {multi_action: true,}, page.schema[op_type][item]);
                }
            }
        });
        return multi_actions;
    }

    /**
     * Method, that sets links to connected list and page views.
     * @param {object} views Dict with view objects.
     * @param {string} page_path Path of page view.
     */
    connectPageAndListViews(views, page_path) {
        // let list_path = page_path.replace(/\{[A-z]+\}\/$/, "");
        let list_path = page_path.replace(/\{[A-z0-9]+\}\/$/, "");
        if(views[list_path]) {
            views[page_path].schema.list_path = list_path;
            views[list_path].schema.page_path = page_path;
        }
    }

    /**
     * Method, that returns dict with views, ready to use.
     * Method creates views, sets internal links for them and so on.
     * @param {class} constructor View class - constructor, that returns View object.
     * @param {object} openapi_schema OpenApi Schema.
     * @return {object} Views Dict of views objects, ready for usage.
     */
    generateViews(constructor, openapi_schema) {
        let views = this.getViews(constructor, openapi_schema);

        for(let path in views){
            if (views.hasOwnProperty(path)) {
                let links = this.getViewInternalLinks(views, path);
                for (let key in links) {
                    if (links.hasOwnProperty(key)) {
                        views[path].schema[key] = links[key];
                    }
                }

                if (views[path].schema.type == 'page') {
                    this.connectPageAndListViews(views, path);
                }
            }
        }

        for(let path in views){
            if(views.hasOwnProperty((path))) {
                if (views[path].schema.type == 'list') {
                    views[path].schema.multi_actions = this.getViewMultiActions(views, path);
                }

                if (views[path].schema.hidden) {
                    delete views[path];
                    continue;
                }

                tabSignal.emit("views[" + path + "].created", {view: views[path]});
            }
        }

        tabSignal.emit("allViews.created", {views: views});

        return views;
    }
}