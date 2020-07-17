Redefinition of VST Utils frontend
===================================
VST Utils is rather flexible framework, so if you need to redefine some base frontend
functionality in your project you can do it in 2 ways:

* :ref:`signals-section` - appropriate for situations, when you need to add some additional functionality to the base one
  or when you need to redefine some parts of entity's structure. For example:

    * add some additional field to :ref:`Model object <model-class>`;
    * change :ref:`Model object's <model-class>` field format;
    * change template of some :ref:`View object <view-class>`;
    * change something in :ref:`View object's <view-class>` schema;
    * extend or redefine behavior of the :ref:`View object's <view-class>` Vue component via mixins;
    * and so on.

* :ref:`class-inheritance-section` - appropriate for situations, when you need to redefine some part of functionality (methods, properties)
  of such base entities as :ref:`model-class`, :ref:`queryset-class`, :ref:`fields-classes`.


Let's look closely on both ways of functionality redefinition.


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

Signals available in VST Utils
------------------------------
VST Utils has some signals, that are emitting during application work.
If you need to customize/redefine something in you project you can subscribe to these signals and do some code with those context.
Also you can emit you own signals in your project, if you need.

Let's look what signals are used in VST Utils.

openapi.loaded
~~~~~~~~~~~~~~
**Signal name:** "openapi.loaded".

**Context argument:** openapi - {object} - OpenAPI schema loaded from API.

**Description:** This signal will be emitted after OpenAPI schema was loaded.
You can use this signal if you need to redefine something in the OpenAPI schema, before it was parsed.

resource.loaded
~~~~~~~~~~~~~~~
**Signal name:** "resource.loaded".

**Context argument:** None.

**Description:** This signal will be emitted after all static files were successfully loaded and added to the page.

app.version.updated
~~~~~~~~~~~~~~~~~~~
**Signal name:** "app.version.updated".

**Context argument:** None.

**Description:** This signal will be emitted during app loading if VST Utils detects,
that version of your project was updated.

app.beforeInitStore
~~~~~~~~~~~~~~~~~~~
**Signal name:** "app.beforeInitStore".

**Context argument:** obj - {object} - Object with following structure: {storeConstructor: StoreConstructor}, where storeConstructor is an instance of StoreConstructor.

**Description:** This signal will be emitted after creation of StoreConstructor instance and before app creation

app.beforeInitRouter
~~~~~~~~~~~~~~~~~~~
**Signal name:** "app.beforeInitRouter".

**Context argument:** obj - {object} - Object with following structure: {routerConstructor: RouterConstructor}, where routerConstructor is an instance of RouterConstructor.

**Description:** This signal will be emitted after creation of RouterConstructor instance and before app creation


app.beforeInit
~~~~~~~~~~~~~~
**Signal name:** "app.beforeInit".

**Context argument:** obj - {object} - Object with following structure: {app: app}, where app is an instance of App class.

**Description:** This signal will be emitted after app variable initialization
(OpenAPI schema was parsed, models and views were created), but before app was mounted to the page.

app.afterInit
~~~~~~~~~~~~~
**Signal name:** "app.afterInit".

**Context argument:** obj - {object} - Object with following structure: {app: app}, where app is an instance of App class.

**Description:** This signal will be emitted after app was mounted to the page.

app.language.changed
~~~~~~~~~~~~~~~~~~~~
**Signal name:** "app.language.changed".

**Context argument:** obj - {object} - Object with following structure: {lang: lang}, where lang is an code of applied language.

**Description:** This signal will be emitted after app interface language was changed.

models[model_name].fields.beforeInit
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "models[" + model_name + "].fields.beforeInit". For example, for User model: "models[User].fields.beforeInit".

**Context argument:** fields - {object} - Object with pairs of key, value, where key - name of field, value - object with it options.
On this moment, field - is just object with options, it is not guiFields instance.

**Description:** This signal will be emitted before creation of guiFields instances for Model fields.

models[model_name].fields.afterInit
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "models[" + model_name + "].fields.afterInit". For example, for User model: "models[User].fields.afterInit".

**Context argument:** fields - {object} - Object with pairs of key, value, where key - name of field, value - guiFields instance.

**Description:** This signal will be emitted after creation of guiFields instances for Model fields.

models[model_name].created
~~~~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "models[" + model_name + "].created". For example, for User model: "models[User].created".

**Context argument:** obj - {object} - Object with following structure: {model: model}, where model is the created Model.

**Description:** This signal will be emitted after creation of Model object.

allModels.created
~~~~~~~~~~~~~~~~~
**Signal name:** "allModels.created".

**Context argument:** obj - {object} - Object with following structure: {models: models}, where models is the object, storing Models objects.

**Description:** This signal will be emitted after all models were created.

views[path].filters.beforeInit
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "views[" + path + "].filters.beforeInit". For example, for ``/user/`` view: "views[/user/].filters.beforeInit".

**Context argument:** filters - {object} - Object with pairs of key, value, where key - name of filter, value - object with it options.
On this moment, filter - is just object with options, it is not guiFields instance.

**Description:** This signal will be emitted before creation of guiFields instances for View filters.

views[path].filters.afterInit
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "views[" + path + "].filters.afterInit". For example, for ``/user/`` view: "views[/user/].filters.afterInit".

**Context argument:** filters - {object} - Object with pairs of key, value, where key - name of filter, value - guiFields instance.

**Description:** This signal will be emitted after creation of guiFields instances for View filters.

views[path].beforeInit
~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "views[" + path + "].beforeInit". For example, for ``/user/`` view: "views[/user/].beforeInit".

**Context argument:** obj - {object} - Object with following structure: {schema: schema, model: model, template: template,},
where schema - object with view schema options, model - model for which current view is created, template - template of view component.

**Description:** This signal will be emitted before creation of View Instance.

views[path].afterInit
~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "views[" + path + "].afterInit". For example, for ``/user/`` view: "views[/user/].afterInit".

**Context argument:** obj - {object} - Object with following structure: {view: view},
where view - created View Instance.

**Description:** This signal will be emitted after creation of View Instance,
but before setting actions / child_links / multi_actions / operations / sublinks properties.

views.afterInitEach
~~~~~~~~~~~~~~~~~~~
**Signal name:** "views.afterInitEach".

**Context argument:** obj - {object} - Object with following structure: { views, path }, where views - object with initialized 
View Instances, path - path of view that was currently initialized.

**Description:** This signal will be emitted after initialization of each view.

allViews.inited
~~~~~~~~~~~~~~~
**Signal name:** "allViews.inited".

**Context argument:** obj - {object} - Object with following structure: {views: views},
where views - object with created View Instances.

**Description:** This signal will be emitted after creation of all View Instances,
but before setting actions / child_links / multi_actions / operations / sublinks properties.

views[path].created
~~~~~~~~~~~~~~~~~~~
**Signal name:** "views[" + path + "].created". For example, for ``/user/`` view: "views[/user/].created".

**Context argument:** obj - {object} - Object with following structure: {view: view},
where view - fully created View Instance.

**Description:** This signal will be emitted after full creation of View Instance,
with set actions / child_links / multi_actions / operations / sublinks properties.

allViews.created
~~~~~~~~~~~~~~~~
**Signal name:** "allViews.created".

**Context argument:** obj - {object} - Object with following structure: {views: views},
where views - object with fully created View Instances.

**Description:** This signal will be emitted after creation of all fully View Instances,
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

**Description:** This signal will be emitted after all routes was formed and added to routes list.

LocalSettings.property
~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** LocalSettings.name + "." + property.
For example, when we set property "skin" to instance of LocalSettings "guiLocalSettings",
signal name will be "guiLocalSettings.skin".

**Context argument:** obj - {object} - Object with following structure {type: 'set', name: property_name, value: property_value}.

**Description:** This signal will be executed, when some property will be set to the Instance of LocalSettings class.

GuiCustomizer.beforeInit
~~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "GuiCustomizer.beforeInit".

**Context argument:** obj - {object} - Instance of GuiCustomizer class.

**Description:** This signal will be executed before initialization of GuiCustomizer Instance.

GuiCustomizer.afterInit
~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "GuiCustomizer.afterInit".

**Context argument:** obj - {object} - Instance of GuiCustomizer class.

**Description:** This signal will be executed after initialization of GuiCustomizer Instance.

GuiCustomizer.skins_custom_settings.reseted
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "GuiCustomizer.skins_custom_settings.reseted".

**Context argument:** obj - {object} - Instance of GuiCustomizer class.

**Description:** This signal will be executed after custom settings of GuiCustomizer skin were reset.

GuiCustomizer.skins_custom_settings.saved
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "GuiCustomizer.skins_custom_settings.saved".

**Context argument:** obj - {object} - Instance of GuiCustomizer class.

**Description:** This signal will be executed after custom settings of GuiCustomizer skin were saved.

GuiCustomizer.skin.name.changed
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "GuiCustomizer.skin.name.changed".

**Context argument:** obj - {object} - Instance of GuiCustomizer class.

**Description:** This signal will be executed after changing of current GuiCustomizer skin.

GuiCustomizer.skin.settings.changed
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
**Signal name:** "GuiCustomizer.skin.settings.changed".

**Context argument:** obj - {object} - Instance of GuiCustomizer class.

**Description:** This signal will be executed after changing of current GuiCustomizer skin's settings.

.. _class-inheritance-section:

Class inheritance
-----------------
If you need to redefine some functionality of such base entities as :ref:`model-class`, :ref:`queryset-class`, :ref:`fields-classes`,
you can use JavaScript class inheritance for this purposes. You can create new class,
that will be inherited from some base VST Utils class and contain some new functionality.

Let's look on the examples.

.. _creation_of_custom_model_or_queryset_class:

Creation of custom Model or QuerySet class
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
There is only one base class for models (Class Model) and one base class for querysets (Class QuerySet) in VST Utils.
These classes are stored in following variables:

* **guiModels** - {object} - variable for storing model classes (base Class Model available as guiModels.Model);
* **guiQuerySets** - {object} - variable for storing queryset classes (base Class QuerySet available as guiQuerySets.QuerySet).

So if you want to add some custom model class, for example, for User Model, you need to write something like this:

.. sourcecode:: javascript

    guiModels.UserModel = class UserModel extends guiModels.Model {
        /*
            some code here
        */
    }

Name of new custom model, that would be a key in guiModels object, is extremely important.
This key should be formed as ``model_name`` + "Model":

.. sourcecode:: javascript

    /**
     * Simple example of model options from OpenAPI Schema.
     * For creation of new custom Model you should not create variable like model_options.
     */
    const model_options = {
        /* ... */
        name: "User";
        /* ... */
    };

    const user_guiModel_name = model_options.name + "Model";

    guiModels[user_guiModel_name] = class UserModel extends guiModels.Model {
        /*
            some code here
        */
   }

So if you model name is "User", then key for guiModels should be equal to the "UserModel".
If model name is "Abc", key - "AbcModel" and so on.

Names of those keys are so important, because during parsing of OpenAPI schema
and creation of base entities (models and querysets) VST Utils will automatically checks
is there some custom class for this entity in classes store objects (guiModels and guiQuerySets).
If there is some relative class for this entity, VST Utils will use it for creation of new model/queryset, otherwise,
it will use base class (guiModels.Model and guiQuerySets.QuerySet).

The same principle works and for custom QuerySets. For example, if you want to create custom QuerySet,
that will be used for User Model, name (key in guiQuerySets) of this should be equal to "UserQuerySet".
If model name is "Abc", name (key) - "AbcQuerySet".

.. sourcecode:: javascript

    guiQuerySets.UserQuerySet = class UserQuerySet extends guiQuerySets.QuerySet {
        /*
           some code here
        */
   }

Creation of custom Field class
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
If you need to create some custom field, you also can use mechanism of JavaScript class inheritance.
All Fields classes are stored in **guiFields** object, so if you want to add some new field, you should write something like this:

.. sourcecode:: javascript

    guiFields.custom_field = class CustomField extends guiFields.base {
        /*
            some code here
        */
   }

Here, in JavaScript class, you can redefine some base properties and methods, that will be available for your new custom_field.
But if you want to change some view properties of you field, you should write some Vue mixin:

.. sourcecode:: javascript

    const custom_field_mixin = {
        /*
            some code here
        */
    };

    guiFields.custom_field = class CustomField extends guiFields.base {
        /*
            some code here
        */

        /**
         * Redefinition of base guiField static property 'mixins'.
         * Here we just add some additional features to Vue component for guiFeilds.base.
         * If you want to add some definitely new Vue component for your custom_field (without mixing to the guiFields.base component)
         * you can write something like this: 'return [custom_field_mixin];'.
         */
        static get mixins() {
            return super.mixins.concat(custom_field_mixin);
        }
    }


Customizing field's Vue component
---------------------------------
Fields' components are being rendered using ``Field.mixins()`` static method. You can append any mixins
(Vue components) to returning array. To change field appearance mixin must define ``render`` method.


Customizing field using ``dynamic`` format
------------------------------------------
Setting ``field.format`` to ``dynamic`` you can provide ``field.additionalProperties.callback``s and customize field on
every rendering, for example:

.. sourcecode:: javascript

    function field1_callback(parent_values = {}) {
        return {
            format: someCondition(parent_values) ? 'string' : 'integer'
        };
    }

    tabSignal.connect('models[Model1].fields.beforeInit', (fields) => {
        if (fields.hasOwnProperty('field1')) {
            fields.field1.format = 'dynamic';
            fields.field1.additionalProperties.callback = field1_callback;
        }
    }


Real field that will be displayed will receive options from ``DynamicField.options`` and data
returned from ``field.options.additionalProperties.callback``.
