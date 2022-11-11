Frontend documentation
===================================

API Flowchart
--------------------------

This flowchart shows how data goes though application from and to API.

.. mermaid::

    graph TD
      PageComponent.created:::Component --> PageComponent.fetchData:::Component
      PageComponent.fetchData --> SMFetchData(Store module action '.fetchData')
      SMFetchData:::StoreModule --> SMUpdate(Store module action '.updateData'):::StoreModule --> QuerySet.get
      subgraph Queryset
      QuerySet.get -- HTTP Request to API --> NewModel(new Model)
      NewModel -- Fk Field in Model --> QuerySet.executeAfterInstancesFetchedHooks --> Field.afterInstancesFetched(Field.afterInstancesFetched/FkField.prefetchValues)
      NewModel --> StoreSetInstance
      Field.afterInstancesFetched --> AggregatedQueriesExecutor.execute --> QuerySet.get
      end
      StoreSetInstance -- Field.toRepresent --> FieldComponent.value
      FieldComponent.value:::Component --> Rendered(Resuslts rendered to page)
      Rendered:::Render -- edit --> FieldComponentEdit
      subgraph Field
      FieldComponentEdit --emits set-value--> FieldComponent
      end
      FieldComponent --emits set-value with field name--> PageComponent.setFieldValue:::Component
      PageComponent.setFieldValue --> SM(Store module '.setFieldValue'):::StoreModule
      SM --> PageComponent.saveInstance:::Component -->   SMValidateGet(Store module '.validateAndGetInstanceData'):::StoreModule
      SMValidateGet --> instance._validateAndSetData -- Field.toInner --> instance.update
      instance.update -- querySet.update --> Post(HTTP Request to API)

    classDef Component stroke:#333,color:#f00;
    classDef StoreModule  stroke:#333,color:#00f;
    classDef Render stroke:#333,color:#393;

.. _signals-section:

Signals
-------
System of signals is a mechanism, that VST Utils uses for app customization.

Let's look how it works.

Very often you need to modify something after some event has occurred.
But how can you know about this event? And what if you need to know about this event in several blocks of code?

To solve this problem VST Utils uses system of signals, where:

* you can emit some signal, which tells all subscribers, that some event has occurred,
  and pass some data/variables from the context, where this event has occurred;
* you can subscribe to some signal, that notifies you about some event, and also you can pass some callback (handler)
  that can do something with data/variables, that were passed from the context, where event had occurred.

Emit signal
~~~~~~~~~~~
To emit some signal you need to write following in you code:

.. sourcecode:: javascript

    tabSignal.emit(name_of_signal, context);

where:

* **name_of_signal** - string, which stores name of signal (event);
* **context** - some variable of any type, that will be passed to the callback (handler) during connection to this signal.

Example of signal emitting:

.. sourcecode:: javascript

    let app = {
        name: 'example of app';
    };

    tabSignal.emit('app.created', app);


Connect to signal
~~~~~~~~~~~~~~~~~
To connect to some signal you need to write following in you code:

.. sourcecode:: javascript

    tabSignal.connect(name_of_signal, callback);

where:

* **name_of_signal** - string, which stores name of signal (event);
* **callback** - function, that can do something with variables, which will be passed from event's context to this callback as arguments.

Example of connecting to signal:

.. sourcecode:: javascript

    /* ... */
    function callback(app) {
        app.title = 'example of app title';
    }

    tabSignal.connect('app.created', callback);
    /* ... */

List of signals in VST Utils
------------------------------
VST Utils has some signals, that are emitting during application work.
If you need to customize something in you project you can subscribe to
these signals and add callback function with desired behavior.
Also you can emit you own signals in your project.


openapi.loaded
~~~~~~~~~~~~~~
**Signal name:** "openapi.loaded".

**Context argument:** openapi - {object} - OpenAPI schema loaded from API.

**Description:** This signal is emitted after OpenAPI schema was loaded.
You can use this signal if you need to change something in the OpenAPI schema, before it was parsed.

resource.loaded
~~~~~~~~~~~~~~~
**Signal name:** "resource.loaded".

**Context argument:** None.

**Description:** This signal is emitted after all static files were successfully loaded and added to the page.

app.version.updated
~~~~~~~~~~~~~~~~~~~
**Signal name:** "app.version.updated".

**Context argument:** None.

**Description:** This signal is emitted during app loading if VST Utils detects,
that version of your project was updated.


app.beforeInitRouter
~~~~~~~~~~~~~~~~~~~~
**Signal name:** "app.beforeInitRouter".

**Context argument:** obj - {object} - Object with following structure: {routerConstructor: RouterConstructor}, where routerConstructor is an instance of RouterConstructor.

**Description:** This signal is emitted after creation of RouterConstructor instance and before app creation


app.beforeInit
~~~~~~~~~~~~~~
**Signal name:** "app.beforeInit".

**Context argument:** obj - {object} - Object with following structure: {app: app}, where app is an instance of App class.

**Description:** This signal is emitted after app variable initialization
(OpenAPI schema was parsed, models and views were created), but before app was mounted to the page.

app.afterInit
~~~~~~~~~~~~~
**Signal name:** "app.afterInit".

**Context argument:** obj - {object} - Object with following structure: {app: app}, where app is an instance of App class.

**Description:** This signal is emitted after app was mounted to the page.

app.language.changed
~~~~~~~~~~~~~~~~~~~~
**Signal name:** "app.language.changed".

**Context argument:** obj - {object} - Object with following structure: {lang: lang}, where lang is an code of applied language.

**Description:** This signal is emitted after app interface language was changed.

models[model_name].fields.beforeInit
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "models[" + model_name + "].fields.beforeInit". For example, for User model: "models[User].fields.beforeInit".

**Context argument:** fields - {object} - Object with pairs of key, value, where key - name of field, value - object with it options.
On this moment, field - is just object with options, it is not guiFields instance.

**Description:** This signal is emitted before creation of guiFields instances for Model fields.

models[model_name].fields.afterInit
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "models[" + model_name + "].fields.afterInit". For example, for User model: "models[User].fields.afterInit".

**Context argument:** fields - {object} - Object with pairs of key, value, where key - name of field, value - guiFields instance.

**Description:** This signal is emitted after creation of guiFields instances for Model fields.

models[model_name].created
~~~~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "models[" + model_name + "].created". For example, for User model: "models[User].created".

**Context argument:** obj - {object} - Object with following structure: {model: model}, where model is the created Model.

**Description:** This signal is emitted after creation of Model object.

allModels.created
~~~~~~~~~~~~~~~~~
**Signal name:** "allModels.created".

**Context argument:** obj - {object} - Object with following structure: {models: models}, where models is the object, storing Models objects.

**Description:** This signal is emitted after all models were created.


allViews.created
~~~~~~~~~~~~~~~~
**Signal name:** "allViews.created".

**Context argument:** obj - {object} - Object with following structure: {views: views},
where views - object with all View Instances.

**Description:** This signal is emitted after creation of all View Instances,
with set actions / child_links / multi_actions / operations / sublinks properties.

routes[name].created
~~~~~~~~~~~~~~~~~~~~
**Signal name:** "routes[" + name + "].created". For example, for ``/user/`` view: "routes[/user/].created".

**Context argument:** route - {object} - Object with following structure: {name: name, path: path, component: component},
where name - name of route, path - template of route's path, component - component, that will be rendered for current route.

**Description:** This signal will be emitted after route was formed and added to routes list.

allRoutes.created
~~~~~~~~~~~~~~~~~
**Signal name:** "allRoutes.created".

**Context argument:** routes - {array} - Array with route objects with following structure: {name: name, path: path, component: component},
where name - name of route, path - template of route's path, component - component, that will be rendered for current route.

**Description:** This signal is emitted after all routes was formed and added to routes list.

<${PATH}>filterActions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "<${PATH}>filterActions".

**Context argument:** obj - {actions: Object[], data} - Actions is array of action objects. Data represents current instance's data.

**Description:** This signal will be executed to filter actions.

<${PATH}>filterSublinks
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "<${PATH}>filterSublinks".

**Context argument:** obj - {sublinks: Object[], data} - Actions is array of sublink objects. Data represents current instance's data.

**Description:** This signal will be executed to filter sublinks.

.. _fields-section:

Field Format
--------------
Very often during creation of some new app developers need to make common fields of some base types and formats
(string, boolean, number and so on). Create everytime similar functionality is rather boring and ineffective,
so we tried ti solve this problem with the help of VST Utils.

VST Utils has set of built-in fields of the most common types and formats, that can be used for different cases.
For example, when you need to add some field to you web form, that should hide value of inserted value,
just set appropriate field format to ``password`` instead of ``string``
to show stars instead of actual characters.


Field classes are used in Model Instances as fields and also are used in Views Instances of ``list`` type as filters.

All available fields classes are stored in the ``guiFields`` variable. There are 44 fields formats in VST Utils:

* **base** - base field, from which the most other fields are inherited;
* **string** - string field, for inserting and representation of some short 'string' values;
* **textarea** - string field, for inserting and representation of some long 'string' values;
* **number** - number field, for inserting and representation of 'number' values;
* **integer** - number field, for inserting and representation of values of 'integer' format;
* **int32** - number field, for inserting and representation of values of 'int32' format;
* **int64** - number field, for inserting and representation of values of 'int64' format;
* **double** - number field, for inserting and representation of values of 'double' format;
* **float** - number field, for inserting and representation of values of 'float' format;;
* **boolean** - boolean field, for inserting and representation of 'boolean' values;
* **choices** - string field, with strict set of preset values, user can only choose one of the available value variants;
* **autocomplete** - string field, with set of preset values, user can either choose one of the available value variants or insert his own value;
* **password** - string field, that hides inserted value by '*' symbols;
* **file** - string field, that can read content of the file;
* **secretfile** - string field, that can read content of the file and then hide it from representation;
* **binfile** - string field, that can read content of the file and convert it to the 'base64' format;
* **namedbinfile** - field of JSON format, that takes and returns JSON with 2 properties: name (string) - name of file and content(base64 string) - content of file;
* **namedbinimage** - field of JSON format, that takes and returns JSON with 2 properties: name (string) - name of image and content(base64 string) - content of image;
* **multiplenamedbinfile** - field of JSON format, that takes and returns array with objects, consisting of 2 properties: name (string) - name of file and content(base64 string) - content of file;
* **multiplenamedbinimage** - field of JSON format, that takes and returns array with objects, consisting of 2 properties: name (string) - name of image and content(base64 string) - content of image;
* **text_paragraph** - string field, that is represented as text paragraph (without any inputs);
* **plain_text** - string field, that saves all non-printing characters during representation;
* **html** - string field, that contents different html tags and that renders them during representation;
* **date** - date field, for inserting and representation of 'date' values in 'YYYY-MM-DD' format;
* **date_time** - date field, for inserting and representation of 'date' values in 'YYYY-MM-DD HH:mm' format;
* **uptime** - string field, that converts time duration (amount of seconds) into one of the most appropriate variants
  (23:59:59 / 01d 00:00:00 / 01m 30d 00:00:00 / 99y 11m 30d 22:23:24) due to the it's value size;
* **time_interval** - number field, that converts time from milliseconds into seconds;
* **crontab** - string field, that has additional form for creation schedule in 'crontab' format;
* **json** - field of JSON format, during representation it uses another guiFields for representation of current field properties;
* **api_object** - field, that is used for representation of some Model Instance from API (value of this field is the whole Model Instance data).
  This is read only field;
* **fk** - field, that is used for representation of some Model Instance from API (value of this field is the Model Instance Primary Key).
  During edit mode this field has strict set of preset values to choose;
* **fk_autocomplete** - field, that is used for representation of some Model Instance from API (value of this field is the Model Instance Primary Key or some string).
  During edit mode user can either choose of the preset values from autocomplete list or insert his own value;
* **fk_multi_autocomplete** - field, that is used for representation of some Model Instance from API (value of this field is the Model Instance Primary Key or some string).
  During edit mode user can either choose of the preset values from modal window or insert his own value;
* **color** - string field, that stores HEX code of selected color;
* **inner_api_object** - field, that is linked to the fields of another model;
* **api_data** - field for representing some data from API;
* **dynamic** - field, that can change its format depending on the values of surrounding fields;
* **hidden** - field, that is hidden from representation;
* **form** - field, that combines several other fields and stores those values as one JSON,
  where key - name of form field, value - value of form field;
* **button** - special field for form field, imitates button in form;
* **string_array** - field, that converts array with strings into one string;
* **string_id** - string field, that is supposed to be used in URLs as 'id' key. It has additional validation,
  that checks, that field's value is not equal to some other URL keys (new/ edit/ remove).

Layout customization with CSS
-----------------------------
If you need to customize elements with css we have some functionality for it.
There are classes applied to root elements of ``EntityView`` (if it contains `ModelField`), ``ModelField`` , ``ListTableRow`` and ``MultiActions`` depending on the fields they contain.
Classes are formed for the fields with "boolean" and "choices" types.
Also classes apply to operations buttons and links.

:Classes generation rules:

* ``EntityView, ModelField and ListTableRow`` - *field-[field_name]-[field-value]*

   **Example:**
    * *"field-active-true"* for model that contains "boolean" field with name "active" and value "true"
    * *"field-tariff_type-WAREHOUSE"* for model that contains "choices" field with name "tariff_type" and value "WAREHOUSE"


* ``MultiActions`` - *selected__field-[field_name]-[field-value]*
   **Example:**
    *"selected__field-tariff_type-WAREHOUSE"* and *"selected__field-tariff_type-SLIDE"* if selected 2 ``ListTableRow`` that contains "choices" field with name "tariff_type" and values "WAREHOUSE" and "SLIDE" respectively.

* ``Operation`` - *operation__[operation_name]*
   **Warning**
    If you hide operations using CSS classes and for example all actions were hidden then Actions dropdown button will still be visible.

    For better control over actions and sublinks see :ref:`changing-actions-or-sublinks`

   **Example:**
    *operation__pickup_point* if operation button or link has name *pickup_point*

Based on these classes, you can change the styles of various elements.

A few use cases:
 * If you need to hide the button for the "change_category" action on a product detail view when product is not "active", you can do so by adding a CSS selector:

   .. code-block:: css

       .field-status-true .operation__change_category {
           display: none;
       }

 * Hide the button for the "remove" action in ``MultiActions`` menu if selected at least one product with status "active":

   .. code-block:: css

     .selected__field-status-true .operation__remove {
         display: none;
     }

 * If you need to change *background-color* to red for order with status "CANCELLED" on ``ListView`` component do this:

   .. code-block:: css

       .item-row.field-status-CANCELLED {
           background-color: red;
       }

   In this case, you need to use the extra class "item-row" (Used for example, you can choose another one) for specify the element to be selected in the selector, because the class "field-status-CANCELLED" is added in different places on the page.
