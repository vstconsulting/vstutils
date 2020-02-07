Root classes providing application work
=======================================
VST Utils has several JavaScript classes, instances of which VST Utils uses for application work.

.. _app-class:

App class
---------
App class is the main class for application.
This class is an abstraction for the whole application.
Let's look what properties and methods instances of this class have.

Properties:
~~~~~~~~~~~

* **api** - object, that manages connection with API (sends API requests). Instance of :ref:`api-connector-class`;
* **models** - dict, that stores all models, generated from OpenAPI schema;
* **views** - dict, that stores all views, generated for all paths from OpenAPI schema;
* **error_handler** - object, that handles errors. Instance of :ref:`error-handler-class`;
* **languages** - array, that stores objects, containing language's name and code;
* **translation** - dict, that stores translations for each language;
* **user** - object, that stores data of authorized user;
* **application** - main(root) Vue instance for current application, that has access to the app router, created by :ref:`router-constructor-class`, and to the app store, created by :ref:`store-constructor-class`.

Methods:
~~~~~~~~

constructor(api_config, openapi, cache)
"""""""""""""""""""""""""""""""""""""""
**Arguments:**

* api_config: {object} - Dict with options for ApiConnector constructor.
* openapi: {object} - Object with OpenAPI schema.
* cache: {object} - Cache instance (is supposed to be instance of FilesCache class).

**Description:** Standard constructor of JS class.
This method creates new App instance with current arguments.

.. _app-class-start-method:

start()
"""""""
**Description:** Method starts application work:
loads necessary initial data from API, registers all models and views, create root Vue instance
and mounts it to the DOM.

initModels()
""""""""""""
**Description:** Method initiates generating of app models
and saves them to the 'models' property of App instance (this.models).

generateModels()
""""""""""""""""
**Description:** Method generates app Models based on the OpenAPI Schema.

initViews()
""""""""""""
**Description:** Method initiates generating of app Views
and saves them to the 'views' property of App instance (this.views).

generateViews()
""""""""""""""""
**Description:** Method generates app Views based on the OpenAPI Schema.

prepareViewsModelsFields()
""""""""""""""""""""""""""
**Description:** Method runs through all views and handles all fields with additionalProperties.

setLanguage(lang)
"""""""""""""""""
**Arguments:**

* lang: {string} - Code of language, that should be set as current App language.

**Description:** Method returns a promise of applying some language to app interface. This method is supposed to be called after app was mounted.

_prefetchTranslation(lang)
""""""""""""""""""""""""""
**Arguments:**

* lang: {string} - Code of language, that should be set as current App language.

**Description:** Method returns a promise of checking that current language exists and translations for language is loaded.

mountApplication()
""""""""""""""""""
**Description:** Method, that creates application's root Vue instance, containing router (created by :ref:`router-constructor-class`), store (created by :ref:`store-constructor-class`),
and mounts it to the DOM.


.. _api-connector-class:

ApiConnector class
------------------
ApiConnector is an abstraction, that manages all requests to the API.
It forms, sends API requests and returns API responses.
Let's look what properties and methods instances of this class have.

Properties:
~~~~~~~~~~~

* **config** - object with config properties for Api connector;
* **openapi** - object, containing OpenAPI Schema;
* **cache** - object, that manages operations connected with caching of api responses;
* **api** - object with methods for providing Api connection;
* **bulk_collector** - object for collecting several bulk requests into one.

Methods:
~~~~~~~~

constructor(config, openapi, cache)
"""""""""""""""""""""""""""""""""""
**Arguments:**

* config: {object} - Dict with options for Api connector.
* openapi: {object} - Object with OpenAPI schema.
* cache: {object} - Cache instance (is supposed to be instance of FilesCache class).

**Description:** Standard constructor of JS class.
This method creates new ApiConnector instance with current arguments.

query(method, url="", data={})
""""""""""""""""""""""""""""""
**Arguments:**

* method: {string} - Method of HTTP request.
* url: {string} - Relative part of link, to which send API requests.
* data: {object} - Query body.

**Description:** Method, that sends API request.

bulkQuery(data)
"""""""""""""""
**Arguments:**

* data: {object} - Body of bulk request.

**Description:**  Method, that collects several bulk requests into one
and then sends it to API. It's a kind of debouncer under sendBulk() method.

sendBulk()
""""""""""
**Description:** Method, that sends one big (collected) bulk request to API.

getHostUrl()
""""""""""""
**Description:** Method returns URL of API host (server).

getTimeZone()
"""""""""""""
**Description:** Method returns string, containing time zone of API host.

getStaticPath()
"""""""""""""""
**Description:** Method returns relative path (from host url) to the directory with static path.

getUserId()
"""""""""""
**Description:** Method returns id of user, that is now authorized and uses application.

loadUser()
""""""""""
**Description:** Method, that loads data of authorized user.

loadLanguages()
"""""""""""""""
**Description:** Method, that returns promise to load list of App languages from API.

getLanguagesFromCache()
"""""""""""""""""""""""
**Description:** Method, that returns promise to get list of App languages from cache.

getLanguages()
""""""""""""""
**Description:** Method, that returns promise to get list of App languages.

loadTranslations(lang)
""""""""""""""""""""""
**Arguments:**

* lang: {string} - Code of language, translations of which to load.

**Description:** Method, that returns promise to load translations for some language from API.

getTranslationsFromCache(lang)
""""""""""""""""""""""""""""""
**Arguments:**

* lang: {string} - Code of language, translations of which to load.

**Description:** Method, that returns promise to get translations for some language from cache.

getTranslations(lang)
"""""""""""""""""""""
**Arguments:**

* lang: {string} - Code of language, translations of which to load.

**Description:** Method, that returns promise to get translations for some language.


.. _error-handler-class:

ErrorHandler class
------------------
ErrorHandler is an abstraction, that handles errors.
Instances of class can transform error to string add show error message to user.

Methods:
~~~~~~~~

constructor()
"""""""""""""
**Description:** Standard constructor of JS class.
This method creates new ErrorHandler instance.

errorToString(error)
""""""""""""""""""""
**Arguments:**

* error: {string | object} - String or object with error message.

**Description:** Method, that transforms error to string.

showError(to_pop_up, to_console)
""""""""""""""""""""""""""""""""
**Arguments:**

* to_pop_up: {string} - String, that will be shown in pop up notification.
* to_console: {string} - String, that will be logged into console.

**Description:** Method, that shows error to user.

defineErrorAndShow(error)
"""""""""""""""""""""""""
**Arguments:**

* error: {string | object} - String or object with error message.

**Description:** Method, that transforms error into string and shows ot to user.


.. _router-constructor-class:

RouterConstructor class
-----------------------
RouterConstructor is an abstraction, that is responsible for generating of application's router.
In current realization of VST Utils, application's router is `Vue Router Instance <https://router.vuejs.org/>`_.
RouterConstructor forms routes and Vue components (based on views) for these routes.

Properties:
~~~~~~~~~~~

* **views** - |dict_of_generated_views_objects_def|
* **components_templates** - |components_templates_def|
* **custom_components_templates** - |custom_components_templates_def|
* **routes** - array, that stores route objects, containing info about route path and mixins, that should be used for generating of component for current route.

.. |dict_of_generated_views_objects_def| replace:: object with generated Views objects (instances of :ref:`view-class`).
.. |components_templates_def| replace:: object with mixins of Views' Vue components of different types (list, page_new, page, page_edit, action). This mixins is supposed to be used for Views, that have description in OpenAPI Schema and they should send some requests to API.
.. |custom_components_templates_def| replace:: object with mixins for Views' Vue components of custom pages (home page, 404 error page). This mixins is supposed to be used for Views, that have no description in OpenAPI Schema and they should not send some requests to API.

Methods:
~~~~~~~~

constructor(views, components_templates, custom_components_templates)
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* views: {object} - |dict_of_generated_views_objects_def|
* components_templates: {object} - |components_templates_def|
* custom_components_templates: {object} - |custom_components_templates_def|

**Description:** Standard constructor of JS class.
This method creates new RouterConstructor instance with current arguments.

.. _router-constructor-class-get-route-component-method:

getRouteComponent(view)
"""""""""""""""""""""""
**Arguments:**

* view: {object} - |view_object_def|

.. |view_object_def| replace:: View object (instance of :ref:`view-class`).

**Description:** Method, that returns mixin for Vue component for a route, connected with current view.

getRouteComponentMixins(view)
"""""""""""""""""""""""""""""
**Arguments:**

* view: {object} - |view_object_def|

**Description:** Method, that collects appropriate mixins for a View Vue component into one array and returns it.

getRoutes()
"""""""""""
**Description:** Method, that returns array of routes objects, existing in current App.

formAllRoutes()
"""""""""""""""
**Description:** Method, that forms array of all routes objects, existing in current App.

formRoutesBasedOnViews()
""""""""""""""""""""""""
**Description:** Method, that forms array of routes objects, existing in current App, and based on App Views,
that were created via :ref:`view-class` and have description in OpenAPI Schema (this.views).

formRoutesBasedOnCustomComponents()
"""""""""""""""""""""""""""""""""""
**Description:** Method, that forms array of routes objects, existing in current App, and based on App custom views components (this.custom_components_templates).

emitSignalAboutRouteCreation(route)
"""""""""""""""""""""""""""""""""""
**Arguments:**

* route: {object} - Object with route properties (name, path, component).

**Description:** Method emits signal: "route was created".

getRouter()
"""""""""""
**Description:** Method, that returns new instance of `Vue Router <https://router.vuejs.org/>`_, containing info about all routes, available in the application.
This Router Instance is ready for usage in application.


.. _store-constructor-class:

StoreConstructor class
-----------------------
StoreConstructor is an abstraction, that is responsible for generating of application's state store.
In current realization of VST Utils, application's state store is `Vuex Instance <https://vuex.vuejs.org/>`_.

Properties:
~~~~~~~~~~~

* **views** - |dict_of_generated_views_objects_def|
* **store** - object, that stores following properties: `state <https://vuex.vuejs.org/guide/state.html>`_, `getters <https://vuex.vuejs.org/guide/getters.html>`_,  `mutations <https://vuex.vuejs.org/guide/mutations.html>`_, `actions <https://vuex.vuejs.org/guide/actions.html>`_.

Methods:
~~~~~~~~

constructor(views)
""""""""""""""""""
**Arguments:**

* views: {object} - |dict_of_generated_views_objects_def|

**Description:** Standard constructor of JS class.
This method creates new StoreConstructor instance with current arguments.

getStore_state()
""""""""""""""""
**Description:** Method, that forms `state <https://vuex.vuejs.org/guide/state.html>`_ property of Store object.

getStore_getters()
""""""""""""""""""
**Description:** Method, that forms store `getters <https://vuex.vuejs.org/guide/getters.html>`_ - properties/methods, that return data from store.

getStore_mutations()
""""""""""""""""""""
**Description:** Method, that forms store `mutations <https://vuex.vuejs.org/guide/mutations.html>`_ - single way of state changing in Vuex store.

getStore_actions()
""""""""""""""""""
**Description:** Method, that forms store `actions <https://vuex.vuejs.org/guide/actions.html>`_ - asynchronous operations.

getStore()
""""""""""
**Description:** Method, that returns application's state store - new instance of `Vuex Store <https://vuex.vuejs.org/>`_,
containing info about `state properties <https://vuex.vuejs.org/guide/state.html>`_, `getters <https://vuex.vuejs.org/guide/getters.html>`_,  `mutations <https://vuex.vuejs.org/guide/mutations.html>`_, `actions <https://vuex.vuejs.org/guide/actions.html>`_, needed for the work of application's state store.
This Store Instance is ready for usage in application.


.. _pop-up-class:

PopUp class
-----------
PopUp is an abstraction, that is responsible for displaying pop up messages (notifications) for user.
In current realization of VST Utils, PopUp class is working based on the  `iziToast <https://izitoast.marcelodolza.com/>`_.

Properties:
~~~~~~~~~~~

* **options** - object, storing pop up settings.

Methods:
~~~~~~~~

constructor(options)
""""""""""""""""""""
**Arguments:**

* options: {object} - object with custom options, that should be used instead of default PopUp class's options.

**Description:** Standard constructor of JS class.
This method creates new PopUp instance with current arguments.

_getPopUpSettings(key, opt={})
""""""""""""""""""""""""""""""
**Arguments:**

* key: {string} - Type of pop up notification.
* opt: {object} - Object with custom settings of new pop up notification.

**Description:** Method, that forms settings for new pop up notification.

_showPopUp(type, opt)
"""""""""""""""""""""
**Arguments:**

* type: {string} - Type of pop up notification.
* opt: {object} - Object with settings of pop up notification.

**Description:** Method, that shows new pop up notification.

_generatePopUp(type="show", message="", opt={})
"""""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* type: {string} - Type of pop up notification.
* message: {string} - Text of pop up notification's body.
* opt: {object} - |pop_up_method_opt_arg_def|

**Description:** Method, that forms settings for new pop up notification and shows it.

default(message="", opt={})
"""""""""""""""""""""""""""
**Arguments:**

* message: {string} - |pop_up_method_msg_arg_def|
* opt: {object} - |pop_up_method_opt_arg_def|

.. |pop_up_method_msg_arg_def| replace:: Body text of pop up notification.
.. |pop_up_method_opt_arg_def| replace:: Object with custom settings for pop up notification.

**Description:** Method, that generates default pop up notification.

info(message="", opt={})
""""""""""""""""""""""""
**Arguments:**

* message: {string} - |pop_up_method_msg_arg_def|
* opt: {object} - |pop_up_method_opt_arg_def|

**Description:** Method, that generates info pop up notification.

success(message="", opt={})
"""""""""""""""""""""""""""
**Arguments:**

* message: {string} - |pop_up_method_msg_arg_def|
* opt: {object} - |pop_up_method_opt_arg_def|

**Description:** Method, that generates success pop up notification.

warning(message="", opt={})
"""""""""""""""""""""""""""
**Arguments:**

* message: {string} - |pop_up_method_msg_arg_def|
* opt: {object} - |pop_up_method_opt_arg_def|

**Description:** Method, that generates warning pop up notification.

error(message="", opt={})
"""""""""""""""""""""""""
**Arguments:**

* message: {string} - |pop_up_method_msg_arg_def|
* opt: {object} - |pop_up_method_opt_arg_def|

**Description:** Method, that generates error pop up notification.

question(message="", answer_buttons = [], opt={})
"""""""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* message: {string} - Question text.
* answer_buttons: {array} - Array of strings - titles for answer buttons.
* opt: {object} - Object with custom settings for question pop up.

**Description:** Method, that generates question pop up. Returns promise of getting user's answer.


.. _local-settings-class:

LocalSettings class
-------------------
LocalSettings is an abstraction, that is responsible for manipulating by settings saved to the `Local Storage <https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage>`_.
It is used for saving some user's local settings to the one property(object) of `Local Storage <https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage>`_.

For example:

.. sourcecode:: javascript

    window.localStorage.localSettings = {
        hideMenu: true,
        lang: "en",
        skin: "default"
    }


Properties:
~~~~~~~~~~~

* **name** - string - Key name of Local Storage's property to which Local Settings will be saved.
* **__settings** - object - Property for storing current settings (including tmpSettings).
* **__tmpSettings** - object - Property for storing temporary settings.
* **__beforeAsTmpSettings** - object - Property for storing setting value, as it was before user set tmpSettings value.

Methods:
~~~~~~~~

constructor(name)
"""""""""""""""""
**Arguments:**

* name: {string} - Key name of Local Storage's property to which Local Settings will be saved.

**Description:** Standard constructor of JS class.
This method creates new LocalSettings instance with current arguments.

sync()
""""""
**Description:** Method syncs this.__settings property with data from window.localStorage[this.name].

get(name)
"""""""""
**Arguments:**

* name: {string} - Key of property from local settings.

**Description:** Method returns property, that is stored is local settings at 'name' key.

set(name, value)
""""""""""""""""
**Arguments:**

* name: {string} - Key of property from local settings.
* value: {any} - Value of property from local settings.

**Description:** Method sets property value in local settings.

delete(name)
""""""""""""
**Arguments:**

* name: {string} - Key of property from local settings.

**Description:** Method deletes property, that is stored is local settings at 'name' key.

setIfNotExists(name, value)
"""""""""""""""""""""""""""
**Arguments:**

* name: {string} - Key of property from local settings.
* value: {any} - Value of property from local settings.

**Description:** Method sets property value in local settings, if it was not set before.

setAsTmp(name, value)
"""""""""""""""""""""
**Arguments:**

* name: {string} - Key of property from local settings.
* value: {any} - Value of property from local settings.

**Description:** Method sets temporary property value in local settings.

__removeTmpSettings()
"""""""""""""""""""""
**Description:** Method removes tmpSettings from current settings and add previous values (if they were).


.. _gui-customizer-class:

GuiCustomizer class
-------------------
GuiCustomizer is an abstraction, that is responsible for changing GUI skins (themes) and for changing skins' settings.

Properties:
~~~~~~~~~~~

* **skin** - object - Object should have 2 properties:

    * name: {string} - name of current skin(theme);
    * settings: {object} - object with settings of current skin (theme).

* **skins** - object - Object, that stores setting of available skins (themes).
* **skins_custom_settings** - object - Object, that stores user's custom settings for skins.
* **form** - object - Object, that stores options, that will be used in formField.options.form. This object has options for formField real elements. This object mixes skin options with form_base options.
* **form_base** - object - Object, that stores base options for formField.options.form. These options should be available in every skin.
* **formField** - object - Property, that stores instance of :ref:`guiField.form <fields-classes>` - this field is responsible for representing skins setting to user.
* **skinField** - object - Property, that stores instance of :ref:`guiField.choices <fields-classes>` - this field is responsible for representing name of selected skin to user.

Methods:
~~~~~~~~

constructor(skin={}, skins={}, custom_setting={})
"""""""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* skin: {object} - Object should have 2 properties:

    * name: {string} - name of current skin(theme);
    * settings: {object} - object with settings of current skin (theme).

* skins: {object} - Object, that stores setting of available skins (themes).
* custom_setting: {object} - Object, that stores user's custom settings for skins.

**Description:** Standard constructor of JS class.
This method creates new LocalSettings instance with current arguments.

init()
""""""
**Description:** Method, that initiates work of guiCustomizer. It creates skin and form fields, forms guiCustomizer form options.

formCss()
"""""""""
**Description:** Method, that forms string, which contains values of CSS variables, based of skin.name and skin.settings.

replaceCss(css)
"""""""""""""""
**Arguments:**

* css: {string} - New CSS.

**Description:** Method, that deletes previous <style></style> DOM element with CSS variables for previous skin and appends new <style></style> DOM element with new styles.

loadSkinCustomSettings()
""""""""""""""""""""""""
**Description:** Method, that returns custom settings of current skin.

applySkinCustomSettings()
"""""""""""""""""""""""""
**Description:** Method, that adds current skin's custom_settings to original settings.

applySkinDefaultSettings()
""""""""""""""""""""""""""
**Description:** Method, that adds default settings of current skin to skin.settings.

updateCssVariables()
""""""""""""""""""""
**Description:** Method, that updates CSS variables, based on current skin settings and changes skin class of 'body' - DOM element. Method, activates current skin settings.

resetSkinSettings()
"""""""""""""""""""
**Description:** Method, that resets custom skin settings to default.

saveSkinSettings()
""""""""""""""""""
**Description:** Method, that saves custom skin settings.

resetSkinSettingsAndUpdateCss()
"""""""""""""""""""""""""""""""
**Description:** Method, that resets custom skin settings to default and updates skin settings.

updateSkinSettings()
""""""""""""""""""""
**Description:** Method, that updates current skin settings.

setSkin(skin)
"""""""""""""
**Arguments:**

* skin: {string} - Name of selected skin.

**Description:** Method, that changes selected skin.

setSkinSettings(settings)
"""""""""""""""""""""""""
**Arguments:**

* settings: {object} - Object with new settings.

**Description:** Method, that changes current skin settings.
