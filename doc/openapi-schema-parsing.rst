Parsing of OpenAPI schema
=========================
OpenAPI schema stores info about API Models and Paths, where these models can be available (views).
VST Utils parsers OpenAPI schema and generates based on it Models objects and Views objects,
that can be used on client (frontend) for SPA generating.

Parsing of OpenAPI schema for getting Models data is done via :ref:`model-constructor-class`.
Generation of Models objects, on the final step of parsing, is done via :ref:`model-class` (or one of its :ref:`children <creation_of_custom_model_or_queryset_class>`).

Parsing of OpenAPI schema for getting Views data is done via :ref:`view-constructor-class`.
Generation of Views objects, on the final step of parsing, is done via :ref:`view-class`.

.. _base-entity-constructor-class:

BaseEntityConstructor class
---------------------------
BaseEntityConstructor is a parent class for :ref:`model-constructor-class` and :ref:`view-constructor-class`.
BaseEntityConstructor class stores common methods for these both classes.

Properties:
~~~~~~~~~~~

* **dictionary** - |dictionary_property_def|

.. |dictionary_property_def| replace:: object, storing info about properties names in OpenAPI Schema and some settings for views of different types. It knows how some properties are named in current swagger version.

Methods:
~~~~~~~~

constructor(openapi_dictionary)
"""""""""""""""""""""""""""""""
**Arguments:**

* openapi_dictionary: {object} - |dictionary_property_def|

**Description:** Standard constructor of JS class.
This method creates new BaseEntityConstructor instance with current arguments.

getModelRefsProps()
"""""""""""""""""""
**Description:** Method, that returns array with properties names, that store reference to model.

getFieldFormat(field)
"""""""""""""""""""""
**Arguments:**

* field: {object} - Object with field options.

**Description:** Method, that defines format of current field.


.. _model-constructor-class:

ModelConstructor class
----------------------
ModelConstructor is a class, that have methods for parsing of OpenAPI schema
and generating of Models objects based on the result of parsing.
ModelConstructor is a child class of :ref:`base-entity-constructor-class`.

Properties:
~~~~~~~~~~~

* **dictionary** - |dictionary_property_def|
* **pk_names** - array, with names of fields, that can have role of PK/ID field.
* **classes** - |models_classes_def|

.. |models_classes_def| replace:: object, with available Model classes. For example, we can have some base :ref:`model-class` and :ref:`some CustomModel class <creation_of_custom_model_or_queryset_class>`.

Methods:
~~~~~~~~

constructor(openapi_dictionary, models_classes)
"""""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* openapi_dictionary: {object} - |dictionary_property_def|
* models_classes: {object} - |models_classes_def|

**Description:** Standard constructor of JS class.
This method creates new ModelConstructor instance with current arguments.

getModelsList(openapi_schema)
"""""""""""""""""""""""""""""
**Arguments:**

* openapi_schema: {object} - |openapi_schema_def|

.. |openapi_schema_def| replace:: Object, storing OpenAPI Schema.

**Description:** Method, that returns Models list, from OpenAPI schema.

getModelFieldsList(model)
"""""""""""""""""""""""""
**Arguments:**

* model: {object} - |models_class_schema_def|

.. |models_class_schema_def| replace:: Schema of model from OpenAPI schema.

**Description:** Method, that returns list of fields for current model.

getModelRequiredFieldsList(model)
"""""""""""""""""""""""""""""""""
**Arguments:**

* model: {object} - |models_class_schema_def|

**Description:** Method, that returns list of required fields' names for current model.

getModelFieldFormat(field)
""""""""""""""""""""""""""
**Arguments:**

* field: {object} - Field from OpenAPI's Model schema.

**Description:** Method, that defines format of current field.

generateModelFields(model, model_name)
""""""""""""""""""""""""""""""""""""""
**Arguments:**

* model: {object} - |models_class_schema_def|
* model_name: {string} - Name of model.

**Description:** Method, that returns object with guiFields for current Model.
Method defines appropriate guiField for every field from OpenAPI's Model schema.

getModelsConstructor(model)
"""""""""""""""""""""""""""
**Arguments:**

* model: {string} - Name of model.

**Description:** Method, that returns Model class
(class, that will be used for creating of Model object based on the OpenAPI's Model schema),
appropriate for current model name.

generateModels(openapi_schema)
""""""""""""""""""""""""""""""
**Arguments:**

* openapi_schema: {object} - |openapi_schema_def|

**Description:** Method, that generates Models objects based on OpenAPI schema.
Method returns dict with generating models.


.. _view-constructor-class:

ViewConstructor class
---------------------
ModelConstructor is a class, that have methods for parsing of OpenAPI schema
and generating of Views objects based on the result of parsing.
ViewConstructor is a child class of :ref:`base-entity-constructor-class`.

Properties:
~~~~~~~~~~~

* **dictionary** - |dictionary_property_def|
* **models** - |dict_of_generated_models_def|

.. |dict_of_generated_models_def| replace:: Object with Models objects, generated based on OpenAPI Schema.

Methods:
~~~~~~~~

constructor(openapi_dictionary, models)
"""""""""""""""""""""""""""""""""""""""
**Arguments:**

* openapi_dictionary: {object} - |dictionary_property_def|
* models: {object} - |dict_of_generated_models_def|

**Description:** Standard constructor of JS class.
This method creates new ViewConstructor instance with current arguments.

getPaths(openapi_schema)
""""""""""""""""""""""""
**Arguments:**

* openapi_schema: {object} - |openapi_schema_def|

**Description:** Method, that returns paths list from OpenAPI Schema.

getPathOperationId(path_obj_prop)
"""""""""""""""""""""""""""""""""
**Arguments:**

* path_obj_prop: {object} - |path_obj_prop_def|

.. |path_obj_prop_def| replace:: Property of path object, from OpenAPI's path dict.

**Description:** Method, that returns 'operation_id' property of current path type object (path_obj_prop).

getTypesOperationAlwaysToAdd()
""""""""""""""""""""""""""""""
**Description:** Method, that returns Array with views types,
to which ViewConstructor should always add operations from dictionary.

getViewSchema_name(path)
""""""""""""""""""""""""
**Arguments:**

* path: {string} - |key_of_path_def|

.. |key_of_path_def| replace:: Key of path object, from OpenAPI's path dict.

**Description:** Method, that returns path's name.

getViewSchema_baseOptions(path)
"""""""""""""""""""""""""""""""
**Arguments:**

* path: {string} - |key_of_path_def|

**Description:** Method, that returns base options of view schema.

getViewSchema_filters(operation_id_filters, path_obj_prop)
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* operation_id_filters: {object} - |operation_id_filters_def|
* path_obj_prop: {object} - |path_obj_prop_def|

.. |operation_id_filters_def| replace:: Filters property from operation_id_options.

**Description:** Method, that returns object with filters for current path.

generateViewSchemaFilters(operation_id_filters, path_obj_prop, path)
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* operation_id_filters: {object} - |operation_id_filters_def|
* path_obj_prop: {object} - |path_obj_prop_def|
* path: {string} - Path of view.

**Description:** Method, that generates new guiField objects for View filters.

getFilterFormat(filter)
"""""""""""""""""""""""
**Arguments:**

* filter: {object} - Object with filter options (object from View schema).

**Description:** Method, that defined format for filter's guiField object.

getViewSchema_operationIdOptions(operation_id, path, path_obj_prop)
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* operation_id: {string} - 'operation_id' value.
* path: {string} - |key_of_path_def|
* path_obj_prop: {object} - |path_obj_prop_def|

**Description:** Method, that return operation_id options for view schema.
It gets 'operation_id' options from openapi_dictionary and sets them.

getModelNameLink(obj, max_level=0, level=0)
"""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* obj: {object} - Property of path object, from OpenAPI's path dict, for which method should find Model name.
* max_level: {number} - Max level of inner recursion.
* level: {number} - Current level of recursion.

getModelName(path_obj_prop)
"""""""""""""""""""""""""""
**Arguments:**

* path_obj_prop: {object} - |path_obj_prop_def|

**Description:** Method, that returns name of Model, connected with current path type object (path_obj_prop).

getViewSchema_model(path_obj_prop)
""""""""""""""""""""""""""""""""""
**Arguments:**

* path_obj_prop: {object} - |path_obj_prop_def|

**Description:** Method, that returns Model, connected with current path type object (path_obj_prop).

getViewTemplate(schema)
"""""""""""""""""""""""
**Arguments:**

* schema: {object} - View schema.

**Description:** Method, that returns template for a current view schema.

getViews(constructor, openapi_schema)
"""""""""""""""""""""""""""""""""""""
**Arguments:**

* constructor: {class} - |view_class_as_constructor_def|
* openapi_schema: {object} - |openapi_schema_def|

.. |view_class_as_constructor_def| replace:: :ref:`view-class` - constructor, that returns View object.

**Description:** Method, that creates views based on OpenAPI Schema.

internalLinkIsOperation(name, path_obj)
"""""""""""""""""""""""""""""""""""""""
**Arguments:**

* name: {string} - Name of a link obj.
* path_obj: {object} - View object of a path, for which internal links are setting.

**Description:** Method, that checks: is current link an operation for this path_obj.

getInternalLinkObj_extension(link_name, link_type, path_obj)
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* link_name: {string} - Name of a link.
* link_type: {string} - Type of link object (child_links, actions, operations, sublinks).
* path_obj: {object} - View object for a path (object FROM which link wll be formed).

**Description:** Method, that returns extension from opeanapi_dictionary for current link obj.

isPathObjSchemaEmpty(path_obj)
""""""""""""""""""""""""""""""
**Arguments:**

* path_obj: {object} - View object for a link path.

**Description:** Method, that defines emptiness of path_obj.

getInternalLinkObj(link_name, link_type, link, link_obj, path_obj)
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* link_name: {string} - Name of a link.
* link_type: {string} - Type of link object (child_links, actions, operations, sublinks).
* link: {string} - Real path of link_obj.
* link_obj: {object} - View object for a link (object TO which link will be formed).
* path_obj: {object} - View object for a path (object FROM which link wll be formed).

**Description:** Method, that returns object for a current link.

getViewInternalLinks(views, path)
"""""""""""""""""""""""""""""""""
**Arguments:**

* views: {object} - Dict with view objects.
* path: {string} - Path of current view.

**Description:** Method, that finds and returns internal links(links for another views) for a current view.

getViewMultiActions(views, path)
""""""""""""""""""""""""""""""""
**Arguments:**

* views: {object} - |views_dict_def|.
* path: {string} - Path of current view.

.. |views_dict_def| replace:: Dict with view objects.

**Description:** Method, that finds and returns multi_actions for a current view.
Multi_actions - actions/operations, that can be called for a list of instances.

connectPageAndListViews(views, page_path)
"""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* views: {object} - |views_dict_def|.
* page_path: {string} - Path of page view.

generateViews(constructor, openapi_schema)
""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* constructor: {class} - |view_class_as_constructor_def|
* openapi_schema: {object} - |openapi_schema_def|

**Description:** Method, that returns dict with views, ready to use.


SubViewWithOutApiPathConstructor class
--------------------------------------
SubViewWithOutApiPathConstructor is a class, that have methods for creation of SubViews of guiViews
- views, paths of which do not exist in API, but they should be in GUI.

For example, we have some paths in API:

* ``/foo/``;
* ``/foo/{pk}/``;
* ``/bar/``;
* ``/bar/{pk}/``.

And we do not have following paths in API:

* ``/foo/{pk}/bar/``;
* ``/foo/{pk}/bar/{bar_id}/``.

But we want them exist in GUI.

Current class creates views for following paths.
All API requests from ``/foo/{pk}/bar/{bar_id}/`` view will be send to the ``/bar/{pk}/`` API path.

Properties:
~~~~~~~~~~~

* **view_constr** - object, that has methods for parsing of OpenAPI Schema and Views generator.
  Instance of :ref:`view-constructor-class`.
* **path_prefix** - string, containing path prefix, that will be added to the SubView.
  For example, for to get SubView ``/foo/{pk}/bar/``, we need to add prefix ``/foo/{pk}/`` to the ``/bar/`` path.

Methods:
~~~~~~~~

constructor(openapi_dictionary, models, opt={})
"""""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* openapi_dictionary: {object} - |dictionary_property_def|
* models: {object} - |dict_of_generated_models_def|
* opt: {object} - Object, with some setting (prefix, for example).

**Description:** Standard constructor of JS class.
This method creates new SubViewWithOutApiPathConstructor instance with current arguments.

generateSubView(views, path, new_path)
""""""""""""""""""""""""""""""""""""""
**Arguments:**

* views: {object} - |views_dict_def|.
* path: {string} - Path of view, that should be cloned as SubView.
* new_path: {string} - Path of SubView.

**Description:** Method, that returns new SubView object.

getSubViewMixin()
"""""""""""""""""
**Description:** Method, that returns mixin for SubView Vue component.
