import $ from 'jquery';
import { capitalize, HttpMethods, joinPaths, mergeDeep, pathToArray, RequestTypes, ViewTypes } from '../utils';
import signals from '../signals.js';
import { QuerySet, SingleEntityQueryset } from '../querySet';
import { NoModel } from '../models';
import { getFieldFormatFactory } from '../fields';
import { ActionView, ListView, PageEditView, PageNewView, PageView } from './View.js';
import DetailWithoutListPageMixin from '../components/page/DetailWithoutListPageMixin.js';

/**
 * Function that checks if status code if OK
 * @param {number|string} code - Http status code.
 * @return {boolean}
 */
function isSuccessful(code) {
    const codeNum = typeof code === 'string' ? parseInt(code) : code;
    return codeNum >= 200 && codeNum < 400;
}

function isBodyParam(param) {
    return param.in === 'body';
}

const FILTERS_TO_EXCLUDE = ['limit', 'offset'];

const EDIT_STYLE_PROPERTY_NAME = 'x-edit-style';
const ACTION_NAME = 'x-action-name';
const IS_MULTI_ACTION_PROPERTY_NAME = 'x-multiaction';

/**
 * ModelConstructor is a class, that have methods to parse of OpenAPI schema
 * and to generate Views objects based on the result of parsing.

 */
export default class ViewConstructor {
    /**
     * Constructor of ViewConstructor class.
     * @param {object} openapi_dictionary Dict, that has info about properties names in OpenApi Schema
     * and some settings for views of different types.
     * @param {Map<string, Function>} modelsClasses
     * @param {Map<string, Function>} fieldsClasses
     */
    constructor(openapi_dictionary, modelsClasses, fieldsClasses) {
        this.dictionary = openapi_dictionary;
        this.modelsClasses = modelsClasses;
        this.fieldsClasses = fieldsClasses;
        this.getFieldFormat = getFieldFormatFactory(fieldsClasses);
    }

    /**
     * Method, that returns path's name.
     * @param {string} path Key of path object, from OpenApi's path dict.
     */
    _getViewName(path) {
        let path_parts = path.replace(/\/{[A-z]+}/g, '').split(/\//g);
        return path_parts[path_parts.length - 2];
    }

    /**
     * Method, that return operation_id options for view schema.
     * It gets operation_id options from openapi_dictionary and sets them.
     * @param {string} operationId  Operation_id value.
     * @param {string} path Key of path object, from OpenApi's path dict.
     * @param {string} method Http method
     */
    getOperationOptions(operationId, path, method) {
        const opt = { operationId };
        let operationOptions = this.dictionary.schema_types[
            Object.keys(this.dictionary.schema_types).find((suffix) => operationId.endsWith(suffix))
        ];

        if (!operationOptions && method === HttpMethods.GET) {
            operationOptions = this.dictionary.schema_types['_get'];
        }

        if (operationOptions) {
            mergeDeep(opt, operationOptions);
            opt.path = path + opt.urlPostfix;
            delete opt.urlPostfix;
        } else {
            mergeDeep(opt, { path, type: ViewTypes.ACTION });
        }

        return opt;
    }

    /**
     * @param {Object} response
     * @return {Function}
     */
    _getOperationModel(response) {
        const responseModelRef =
            response.schema?.$ref || // Detail view
            response.schema?.properties?.results?.items?.$ref || // List view
            NoModel.name; // Default model

        return this.modelsClasses.get(responseModelRef.split('/').pop());
    }

    /**
     * Method, that creates views based on OpenApi schema.
     * @param {object} schema OpenApi Schema.
     * @return {Map<string, View>} views Dict of views objects.
     */
    getViews(schema) {
        /**
         * @type {Map<string, View>}
         */
        const views = new Map();
        const viewsSchema = schema[this.dictionary.paths.name];

        const paths = Object.keys(viewsSchema);
        paths.sort();

        const editStyleViewDefault = schema.info[EDIT_STYLE_PROPERTY_NAME];

        for (const path of paths) {
            const pathSchema = viewsSchema[path];
            const dataType = pathToArray(path);
            const level = dataType.length;
            const parentDataType = dataType.slice(0, -1);
            const parentPath = level > 1 ? joinPaths(...parentDataType) : null;
            let parent = views.get(parentPath);

            const viewName = this._getViewName(path);
            const commonOptions = {
                level,
                name: viewName,
                title: capitalize(viewName.replace(/_/g, ' ')),
            };

            /** @type {ListView} */
            let listView = null;
            /** @type {PageView} */
            let pageView = null;
            /** @type {PageEditView} */
            let editView = null;
            /** @type {PageNewView} */
            let newView = null;
            let hasRemoveAction = false;

            /**
             * @type {Action}
             */
            let action = null;

            const editStyleView =
                pathSchema[EDIT_STYLE_PROPERTY_NAME] !== undefined
                    ? pathSchema[EDIT_STYLE_PROPERTY_NAME]
                    : editStyleViewDefault;

            for (const httpMethod of HttpMethods.ALL) {
                const operationSchema = pathSchema[httpMethod];
                if (!operationSchema) continue;
                const operationId = operationSchema[this.dictionary.paths.operation_id.name];

                const request = Object.values(operationSchema.parameters).find(isBodyParam);
                const requestModel = request ? this._getOperationModel(request) : null;

                const responseCode = Object.keys(operationSchema.responses).find(isSuccessful);
                const response = operationSchema.responses[responseCode];
                const responseSchemaType = response.schema?.type;
                const responseModel = this._getOperationModel(response);

                const operationOptions = mergeDeep(
                    { method: httpMethod, requestModel, responseModel },
                    commonOptions,
                    operationSchema,
                    this.getOperationOptions(operationId, path, httpMethod),
                );

                if (operationOptions['x-label']) operationOptions.title = operationOptions['x-label'];

                if (operationOptions.type === ViewTypes.LIST) {
                    operationOptions.filters = this._generateFilters(path, operationOptions.parameters);
                    const qs = new QuerySet(path, { [RequestTypes.LIST]: [null, responseModel] });
                    listView = new ListView(operationOptions, qs);
                    views.set(path, listView);
                    const filterAction = this.dictionary.paths.operations.list.filters;
                    listView.actions.set(filterAction.name, filterAction);
                    continue;
                }

                if (operationOptions.type === ViewTypes.PAGE) {
                    operationOptions.isFileResponse = responseSchemaType === 'file';
                    pageView = new PageView(operationOptions, null);
                    views.set(pageView.path, pageView);
                } else if (operationOptions.type === ViewTypes.PAGE_NEW) {
                    newView = new PageNewView(operationOptions, null);
                    views.set(newView.path, newView);
                } else if (operationOptions.type === ViewTypes.PAGE_EDIT) {
                    editView = new PageEditView(operationOptions, null);
                    views.set(editView.path, editView);
                } else if (operationOptions.type === ViewTypes.PAGE_REMOVE) {
                    hasRemoveAction = true;
                } else if (operationOptions.type === ViewTypes.ACTION) {
                    const isEmpty =
                        !requestModel || requestModel.fields.size === 0 || requestModel === NoModel;
                    const isMultiAction =
                        (operationOptions[IS_MULTI_ACTION_PROPERTY_NAME] !== undefined &&
                            operationOptions[IS_MULTI_ACTION_PROPERTY_NAME]) ||
                        isEmpty;

                    const params = {
                        name: operationOptions.name,
                        title: operationOptions.title,
                        method: httpMethod,
                        path,
                        requestModel,
                        responseModel,
                        isMultiAction,
                        isEmpty,
                    };
                    if (!isEmpty) {
                        const view = new ActionView(operationOptions, null);
                        const executeAction = {
                            ...this.dictionary.paths.operations.action.execute,
                            title: operationOptions[ACTION_NAME] || operationOptions.title,
                        };
                        view.actions.set(executeAction.name, executeAction);
                        params.appendFragment = pathToArray(view.path).last;
                        params.view = view;
                        views.set(view.path, view);
                    }
                    action = params;
                }
            }

            const isNested = parent;
            const isListPath = listView;
            const parentIsList = parent && parent.type === ViewTypes.LIST;
            const isDetailPath = !isListPath && pageView;
            const isDetailWithoutList = isDetailPath && !dataType[dataType.length - 1].includes('{');
            const isListDetail = parentIsList && isDetailPath && dataType[dataType.length - 1].includes('{');

            // Set list path models
            if (isListDetail) {
                parent.objects.models[RequestTypes.RETRIEVE] = pageView.modelsList;
                pageView.objects = parent.objects;
                if (editView) {
                    const requestType = editView.isPartial
                        ? RequestTypes.PARTIAL_UPDATE
                        : RequestTypes.UPDATE;
                    parent.objects.models[requestType] = editView.modelsList;
                    editView.objects = parent.objects;
                }
            }

            // Set new page queryset
            if (isListPath && newView) {
                listView.objects.models[RequestTypes.CREATE] = newView.modelsList;
                newView.objects = listView.objects;
            }

            // Set detail path models
            if (isDetailWithoutList) {
                pageView.mixins.push(DetailWithoutListPageMixin);
                pageView.objects = new SingleEntityQueryset(pageView.path, {
                    [RequestTypes.RETRIEVE]: pageView.modelsList,
                });
                if (newView) {
                    newView.mixins.push(DetailWithoutListPageMixin);
                    pageView.objects.models[RequestTypes.CREATE] = newView.modelsList;
                    newView.objects = pageView.objects;
                }
                if (editView) {
                    editView.mixins.push(DetailWithoutListPageMixin);
                    const requestType = editView.isPartial
                        ? RequestTypes.PARTIAL_UPDATE
                        : RequestTypes.UPDATE;
                    pageView.objects.models[requestType] = editView.modelsList;
                    editView.objects = pageView.objects;
                }
            }

            // Set nested list view
            if (isNested && isListPath)
                parent.sublinks.set(listView.params.name, {
                    name: listView.params.name,
                    title: listView.params.title,
                    href: listView.path,
                });

            // Edit style views
            if (editStyleView && editView && pageView) {
                views.delete(editView.path);
                views.set(pageView.path, editView);
                editView.path = pageView.path;
                editView.isEditStyleOnly = true;
                pageView = editView;
            }

            // Set nested page view
            if (isNested && isDetailWithoutList) {
                parent.sublinks.set(pageView.params.name, {
                    name: pageView.params.name,
                    title: pageView.params.title,
                    href: pageView.path,
                });
            }

            // Set pagePath and listPath
            if (pageView && isListDetail) {
                parent.pageView = pageView;
                pageView.listView = parent;
                if (editView) editView.listView = parent;
            }

            // Set edit view actions
            if (editView) {
                const saveAction = this.dictionary.paths.operations.page_edit.save;
                const reloadAction = this.dictionary.paths.operations.page_edit.reload;
                editView.actions.set(saveAction.name, saveAction);
                editView.actions.set(reloadAction.name, reloadAction);
            }

            // Set edit sublink
            if (editView && !editStyleView) {
                const pageEditSublink = mergeDeep(
                    { view: editView },
                    this.dictionary.paths.operations.page.edit,
                );
                if (pageView) pageView.sublinks.set(pageEditSublink.name, pageEditSublink);
            }

            // Set remove action
            if (hasRemoveAction) {
                const pageRemoveAction = mergeDeep({}, this.dictionary.paths.operations.base.remove);
                if (pageView) pageView.actions.set(pageRemoveAction.name, pageRemoveAction);
                if (parentIsList) parent.multiActions.set(pageRemoveAction.name, pageRemoveAction);
            }

            // Set new sublink/action
            if (newView) {
                const saveAction = this.dictionary.paths.operations.page_new.save_new;
                newView.actions.set(saveAction.name, saveAction);

                const viewToLink = (isDetailPath && pageView) || listView || parent;
                newView.listView = viewToLink;
                const newAction = mergeDeep({}, this.dictionary.paths.operations.list.new);
                viewToLink.sublinks.set(newAction.name, newAction);
                if (newView.nestedAllowAppend) {
                    const options = mergeDeep({}, this.dictionary.paths.operations.list.add);
                    viewToLink.actions.set(options.name, options);
                }
            }

            // Set action
            if (action && isNested) {
                parent.actions.set(action.name, action);
                if (
                    action.isMultiAction &&
                    [ViewTypes.PAGE, ViewTypes.PAGE_EDIT].includes(parent.type) &&
                    parent.listView
                ) {
                    parent.listView.multiActions.set(action.name, action);
                }
            }

            // Set pkParamName
            if (isListDetail) {
                const param = path
                    .replace(/^\/|\/$/g, '')
                    .split('/')
                    .last.replace('{', '')
                    .replace('}', '');

                for (const view of [pageView, editView]) if (view) view.pkParamName = param;
            }

            // Add cancel action
            if (editView && !editView.isEditStyleOnly) {
                const cancel = mergeDeep({}, this.dictionary.paths.operations.page_edit.cancel);
                editView.actions.set(cancel.name, cancel);
            }

            // Set subscription labels to queryset
            if (listView && listView.subscriptionLabels) {
                listView.objects.listSubscriptionLabels = listView.subscriptionLabels.slice();
            }

            // Set deep nested properties
            if (listView && dataType.length >= 3) {
                // Get view that is 2 fragments closer to root
                const deepRoot = views.get(`/${dataType.slice(0, -2).join('/')}/`);
                if (deepRoot instanceof ListView && deepRoot.deepNestedViewFragment === dataType.last) {
                    listView.deepNestedParentView = deepRoot;
                    deepRoot.deepNestedView = listView;
                    listView.objects = deepRoot.objects;

                    delete listView.filters.__deep_parent;
                    delete deepRoot.filters.__deep_parent;
                }
            }

            // Set sublink to deep nested objects
            if (parentIsList && parent.deepNestedParentView) {
                pageView.sublinks.set(parent.name, {
                    name: parent.name,
                    title: parent.title,
                    appendFragment: parent.deepNestedParentView.deepNestedViewFragment,
                });
            }
        }

        this._setNestedQuerysets(views);
        this._setParents(views);

        signals.emit('allViews.created', { views });

        return views;
    }

    /**
     * Method, that generates new guiField objects for View filters.
     * @return {Object<string, BaseField>}
     */
    _generateFilters(path, parameters) {
        const filters = {};

        const parametersCopy = Object.values($.extend(true, {}, parameters)).filter(
            (f) => !FILTERS_TO_EXCLUDE.includes(f.name),
        );

        signals.emit(`views[${path}].filters.beforeInit`, parametersCopy);

        for (const parameterObject of parametersCopy) {
            const format = this.getFieldFormat(parameterObject);
            const fieldConstructor = this.fieldsClasses.get(format);
            filters[parameterObject.name] = new fieldConstructor(
                $.extend(true, { format }, parameterObject, { readOnly: false }),
            );
        }

        signals.emit(`views[${path}].filters.afterInit`, parametersCopy);

        return filters;
    }

    /**
     * Method that sets nested querysets needed for to getting instances that can be added
     * @param {Map<string, View>} views
     */
    _setNestedQuerysets(views) {
        /** @type {Map<string, QuerySet>} */
        const qsCache = new Map();
        const listViews = Array.from(views.values())
            .filter((view) => view.type === ViewTypes.LIST)
            .sort((a, b) => a.level - b.level);

        for (const listView of listViews) {
            const modelName = listView.objects.getResponseModelClass(RequestTypes.LIST).name;
            if (!qsCache.has(modelName)) qsCache.set(modelName, listView.objects);
        }

        /** @type {ListView[]} */
        const nestedListViews = Array.from(views.values())
            .filter((view) => view instanceof PageNewView && view.nestedAllowAppend)
            .map((view) => view.listView);

        for (const nestedListView of nestedListViews) {
            const modelName = nestedListView.objects.getResponseModelClass(RequestTypes.LIST).name;
            const qs = qsCache.get(modelName);
            if (!qs) throw new Error(`Cannot find queryset for model: ${modelName}`);
            nestedListView.nestedQueryset = qs;
        }
    }

    /**
     * @param {Map<string, View>} views
     */
    _setParents(views) {
        for (const [path, view] of views) {
            const parent = views.get(path.replace(/[^/]+\/$/, ''));
            if (parent) view.parent = parent;
        }
    }

    /**
     * Method, that returns dict with views, ready to use.
     * Method creates views, sets internal links for them and so on.
     * @param {object} openapi_schema OpenApi Schema.
     * @return {Map<string, View>} Map of views objects, ready for usage.
     */
    generateViews(openapi_schema) {
        return this.getViews(openapi_schema);
    }
}
