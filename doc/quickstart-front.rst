Frontend Quickstart
===================================


VST utils framework uses Vue ecosystem to render frontend. The quickstart manual will guide you through the most important steps to customize frontend features.
App installation and setting up described in - :doc:`Backend Section <quickstart>` of this docs.

There are several stages in vstutils app:

1. Before app started:

    * `checkCacheVersions()` checks if app version has been changed since last visit and cleans all cached data if so;
    * loading open api schema from backend. Emits 'openapi.loaded' signal;
    * loading all static files from `SPA_STATIC` in setting.py;
    * sets `AppConfiguration` from openapi schema;

2. App started:

    * if there is centrifugoClient in settings.py connects it. To read more about centrifugo configuration check ":ref:`centrifugo`";
    * downloading a list of available languages and translations;
    * `api.loadUser()` returns user data;
    * `ModelsResolver` creates models from schema, emits signal `models[${modelName}].created` for each created model and `allModels.created` when all models created;
    * `ViewConstructor.generateViews()` inits `View` fieldClasses and modelClasses;
    * `QuerySetsResolver` finds appropriate queryset by model name and view path;
    * `global_components.registerAll()`  registers Vue `global_components`;
    * `prepare()` emits `app.beforeInit` with { app: this };
    * initialize model with `LocalSettings`. Find out more about this in the section :ref:`localSettings`;
    * creates routerConstructor from `this.views`, emits 'app.beforeInitRouter' with { routerConstructor } and gets new VueRouter({this.routes});
    * inits application `Vue()` from schema.info, pinia store and emits 'app.afterInit' with {app: this};

3. Application mounted.


There is a flowchart representing application initialization process (signal names have red font):

.. mermaid::

    graph TD
      Cached("checkCachedVersion()")--New App Version-->Clean("cleanAllCache()");
      Cached--Same App Version-->Schema(Load Schema);
      Clean-->Cached
      Schema--'openapi.loaded'-->AppConfiguration
      AppConfiguration--Has Centrifugo options-->Centrifugo(Connect Centrifugo)
      AppConfiguration--No Centrifugo-->Translation
      Centrifugo-->Translation(Load translation, <br/> load languages)
      Translation-->LoadUser("api.LoadUser()")-->ModelsResolver
      subgraph Models generation
      ModelsResolver--All Models Created-->B('allModels.created'):::classSignal
      ModelsResolver--Not All Models Created-->Create(Create Model)
      Create(Create Model)-->SignalBeforeInit("'models#91;modelName#93;.fields.beforeInit'"):::classSignal-->Fields(Create Fields)
      Fields(Create Fields)-->SignalAfterInit("'models#91;modelName#93;.fields.afterInit'"):::classSignal-->modelsmodelName("'models#91;modelName#93;.created'"):::classSignal
      modelsmodelName-->ModelsResolver
      end
      ViewConstructor("ViewConstructor.generateViews()")--'allViewsCreated'-->QuerySetResolver
      QuerySetResolver--finds approppriate querySet-->registerAll("global_components.registerAll()")
      registerAll--registers Vue global_components-->prepare
      prepare--'app.beforeInit'-->RouterConstuctor
      RouterConstuctor--'app.beforeInitRouter'-->D("new VueRouter()")
      D-->E(Vue Internationalization plugin - i18n)
      E-->F(Create new Vue Instance)

    linkStyle 3 stroke:red,color:red
    linkStyle 11 stroke:red,color:red
    linkStyle 12 stroke:red,color:red
    linkStyle 14 stroke:red,color:red
    linkStyle 16 stroke:red,color:red
    linkStyle 19 stroke:red,color:red
    linkStyle 20 stroke:red,color:red

    classDef classSignal stroke:#333,color:#f00;

.. _field-section:

Field customization
-------------------
To add custom script to the project, set script name in settings.py

.. sourcecode:: python

    SPA_STATIC += [
        {'priority': 101, 'type': 'js', 'name': 'main.js', 'source': 'project_lib'},
    ]


and put the script (`main.js`) in `{appName}/static/` directory.

1. In `main.js` create new field by extending it from BaseField (or any other appropriate field)

    For example lets create a field that renders HTML h1 element with 'Hello World!` text:

.. sourcecode:: javascript

    class CustomField extends spa.fields.base.BaseField {
        static get mixins() {
            return super.mixins.concat({
                render(createElement) {
                    return createElement('h1', {}, 'Hello World!');
                },
            });
        }
    }

Or render person's name with some prefix

.. sourcecode:: javascript

    class CustomField extends spa.fields.base.BaseField {
      static get mixins() {
        return super.mixins.concat({
          render(h) {
            return h("h1", {}, `Mr ${this.$props.data.name}`);
          },
        });
      }
    }


2. Register this field to `app.fieldsResolver` to provide appropriate field format and type to a new field

.. sourcecode:: javascript

    const customFieldFormat = 'customField';
    app.fieldsResolver.registerField('string', customFieldFormat, CustomField);

3. Listen for a appropriate `models[ModelWithFieldToChange].fields.beforeInit` signal to change field Format

.. sourcecode:: javascript

    spa.signals.connect(`models[ModelWithFieldToChange].fields.beforeInit`, (fields) => {
        fields.fieldToChange.format = customFieldFormat;
    });


List of  models and their fields is available during runtime in console at `app.modelsClasses`

To change Filed behavior, create new field class with a desired logic. Let's say you need to send number of milliseconds
to API, user however wants to type in number of seconds. A solution would be to override field's `toInner`
and `toRepresent` methods.

.. sourcecode:: javascript

    class MilliSecondsField extends spa.fields.numbers.integer.IntegerField {
      toInner(data) {
        return super.toInner(data) * 1000;
      }
      toRepresent(data) {
        return super.toRepresent(data)/1000;
      }
    }

    const milliSecondsFieldFormat = 'milliSeconds'
    app.fieldsResolver.registerField('integer', milliSecondsFieldFormat, MilliSecondsField);
    spa.signals.connect(`models[OneAllFields].fields.beforeInit`, (fields) => {
      fields.integer.format = milliSecondsFieldFormat;
    });

Now you have field that show seconds, but saves/receives data in milliseconds on detail view of AllFieldsModel.

Change path to FkField
----------------------
Sometime you may need to request different set of objects for FkField. For example to choose from only famous authors,
create `famous_author` endpoint on backend and set FkField request path to `famous_author`.
Listen for `app.beforeInit` signal.

.. sourcecode:: javascript

    spa.signals.connect('app.beforeInit', ({ app }) => {
      app.modelsResolver.get('OnePost').fields.get('author').querysets.get('/post/new/')[0].url = '/famous_author/'
    });

Now when we create new post on `/post/` endpoint Author FkField makes get request to `/famous_author/` instead of `/author/`. It's
useful to get different set of authors (that may have been previously filtered on backend).

CSS Styling
-----------

1. Like scripts, css files may be added to SPA_STATIC in setting.py

.. sourcecode:: python

    SPA_STATIC += [

        {'priority': 101, 'type': 'css', 'name': 'style.css', 'source': 'project_lib'},
    ]



Let's inspect page and find css class for our customField. It is `column-format-customField` and  generated with `column-format-{Field.format}` pattern.


2. Use regular css styling to change appearance of the field.

.. code-block:: css

    .column-format-customField:hover {
        background-color: orangered;
        color: white;
    }


Other page elements are also available for styling: for example, to hide certain column set corresponding field to none.

.. code-block:: css

    .column-format-customField {
        display: none;
    }

Show primary key column on list
-------------------------------

Every pk column has `pk-column` CSS class and hidden by default (using `display: none;`).

For example this style will show pk column on all list views of `Order` model:

.. sourcecode:: css

    .list-Order .pk-column {
        display: table-cell;
    }


View customization
-------------------

Listen for signal `"allViews.created"` and add new custom mixin to the view.

Next code snippet depicts rendering new view instead of default view.

.. sourcecode:: javascript

    spa.signals.once('allViews.created', ({ views }) => {
        const AuthorListView = views.get('/author/');
        AuthorListView.mixins.push({
            render(h) {
                return h('h1', {}, `Custom view`);
            },
        });
    });

Learn more about Vue `render()` function at `Vue documentation <https://v3.vuejs.org/guide/render-function.html>`_.


It is also possible to fine tune View by overriding default computed properties and methods of existing mixins.
For example, override breadcrumbs computed property to turn off breadcrumbs on Author list View

.. sourcecode:: javascript

    import { ref } from 'vue';

    spa.signals.once("allViews.created", ({ views }) => {
        const AuthorListView = views.get("/author/");
        AuthorListView.extendStore((store) => {
            return {
                ...store,
                breadcrumbs: ref([]),
            };
        });
    });

Sometimes you may need to hide detail page for some reason, but still want all actions and sublinks to be accessible from list page.
To do it you also should listen signal `"allViews.created"` and change parameter `hidden` from default `false` to `true`, for example:

.. sourcecode:: javascript

    spa.signals.once('allViews.created', ({ views }) => {
        const authorView = views.get('/author/{id}/');
        authorView.hidden = true;
    });


Basic Webpack configuration
---------------------------
To use webpack in you project rename `webpack.config.js.default` to `webpack.config.js`.
Every project based on vst-utils contains `index.js` in `/frontend_src/app/` directory.
This file is intended for your code. Run `yarn` command to install all dependencies. Then run `yarn devBuild`
from root dir of your project to build static files. Final step is to add built file to `SPA_STATIC` in `settings.py`

.. sourcecode:: python

    SPA_STATIC += [
        {'priority': 101, 'type': 'js', 'name': '{AppName}/bundle/app.js', 'source': 'project_lib'},
    ]

Webpack configuration file allows to add more static files. In `webpack.config.js` add more entries

.. sourcecode:: javascript

    const config = {
      mode: setMode(),
      entry: {
        'app': entrypoints_dir + "/app/index.js" // default,
        'myapp': entrypoints_dir + "/app/myapp.js" // just added
      },

Output files will be built into `frontend_src/{AppName}/static/{AppName}/bundle` directory. Name of output file
corresponds to name of entry in `config`. In the example above output files will have names `app.js` and `myapp.js`.
Add all of these files to `STATIC_SPA` in `settings.py`. During vstutils installation trough `pip`
frontend code are being build automatically, so you may need to add `bundle` directory to `gitignore`.


Page store
----------
Every page has store that can be accessed globally `app.store.page` or from page component using `this.store`.

View method `extendStore` can be used to add custom logic to page's store.

.. sourcecode:: javascript

    import { computed } from 'vue';

    spa.signals.once('allViews.created', ({ views }) => {
        views.get('/user/{id}/').extendStore((store) => {
            // Override title of current page using computed value
            const title = computed(() => `Current page has ${store.instances.hength} instances`);

            async function fetchData() {
                await store.fetchData();  // Call original fetchData
                await callSomeExternalApi(store.instances.value);
            }

            return {
                ...store,
                title,
                fetchData,
            };
        });
    });


Overriding root component
-------------------------
Root component of the application can be overridden using `app.beforeInit` signal. This can be useful for such things as
changing layout CSS classes, back button behaviour or main layout components.

Example of customizing sidebar component:

.. sourcecode:: javascript

    const CustomAppRoot = {
        components: { Sidebar: CustomSidebar },
        mixins: [spa.AppRoot],
    };
    spa.signals.once('app.beforeInit', ({ app }) => {
        app.appRootComponent = CustomAppRoot;
    });


Translating values of fields
----------------------------
Values tha displayed by `FKField` of `ChoicesField` can be translated using standard translations files.

Translation key must be defined as `:model:<ModelName>:<fieldName>:<value>`. For example:

.. sourcecode:: python

    TRANSLATION = {
        ':model:Category:name:Category 1': 'Категория 1',
    }

Translation of values can be taxing as every model on backend usually generates more than one model on frontend,
To avoid this, add `_translate_model = 'Category'` attribute to model on backend. It shortens

.. sourcecode:: python

        ':model:Category:name:Category 1': 'Категория 1',
        ':model:OneCategory:name:Category 1': 'Категория 1',
        ':model:CategoryCreate:name:Category 1': 'Категория 1',


to

.. sourcecode:: python

        ':model:Category:name:Category 1': 'Категория 1',

For `FKField` name of the related model is used. And `fieldName` should be equal to `viewField`.


.. _changing-actions-or-sublinks:

Changing actions or sublinks
----------------------------

Sometimes using only schema for defining actions or sublinks is not enough.

For example we have an action to make user a superuser (`/user/{id}/make_superuser/`) and we want to hide that action if
user is already a superuser (`is_superuser` is `true`). `<${PATH}>filterActions` signal can be used to achieve such result.

.. sourcecode:: javascript

    spa.signals.connect('</user/{id}/make_superuser/>filterActions', (obj) => {
        if (obj.data.is_superuser) {
            obj.actions = obj.actions.filter((action) => action.name !== 'make_superuser');
        }
    });


1. `<${PATH}>filterActions` recieves {actions, data}
2. `<${PATH}>filterSublinks` recieves {sublinks, data}

Data property will contain instance's data. Actions and sublinks properties will contain arrays with default
items (not hidden action or sublinks), it can be changed or replaced completely.

.. _localSettings:

LocalSettings
-------------

This model's fields are displayed in the left sidebar.
All data from this model saves in browser Local Storage.
If you want to add another options, you can do it using `beforeInit` signal, for example:

.. sourcecode:: javascript

    spa.signals.once('models[_LocalSettings].fields.beforeInit', (fields) => {
            const cameraField = new spa.fields.base.BaseField({ name: 'camera' });
            // You can add some logic here
            fields.camera = cameraField;
    })


Store
-----

There are three ways to store data:

    * userSettingsStore - saves data on the server. By default, there are options for changing language and a button to turn on/off the dark mode.
      Data to userSettingsStore comes from schema.
    * localSettingsStore - saves data in the browser Local Storage. This is where you can store your own fields, as described in :ref:`localSettings`.
    * store - stores current page data.

To use any of this stores you need to run the following command: :code:`app.[storeName]`, for example: :code:`app.userSettingsStore`.

.. note:: If you are accessing the userSettingsStore from within the component then you need to use :code:`this.$app` instead :code:`app`.

From `app.store` you may need:

    * `vewsItems` and `viewItemsMap` - stores information about parent views for this page. It is used for example in breadcrumbs.
      The difference between them is only in the way information is stored: `viewItems` is an Array of Objects and `viewItemsMap` is a Map.
    * `page` - saves all information about current page.
    * `title` - title of current page.

