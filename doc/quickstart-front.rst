Frontend Quickstart
===================================


VST utils framework uses Vue ecosystem to render frontend. The quickstart manual will guide you through the most important steps to customize frontend features.
App installation and setting up described in - :doc:`Backend Section <quickstart>` of this docs.

There are several stages in vstutils app:

1. Before app started:

    * `checkCacheVersions()` checks if app version has been changed since last visit and cleans all cached data if so;
    * gets schema from backend and loads it. Emits 'openapi.loaded' signal;
    * sets `AppConfiguration` from openapi schema;

2. App started:

    * if there is centrifugoClient in settings.py connects it;
    * loads translations;
    * `api.loadUser()` returns user data;
    * `prepareFieldsClasses()` used to customize field class;
    * `ModelsResolver` creates models from schema, emits signal `models[${modelName}].created` for each created model and `allModels.created` when all models created;
    * `ViewConstructor.generateViews()` inits `View` fieldClasses and modelClasses;
    * `QuerySetsResolver` finds appropriate queryset by model name and view path;
    * `global_components.registerAll()`  registers Vue `global_components`;
    *  `prepare()` emits `app.beforeInit` with { app: this };
    * creates StoreConstructor from `this.views` and emits 'app.beforeInitStore' with { storeConstructor };
    * creates routerConstructor from `this.views`, emits 'app.beforeInitRouter' with { routerConstructor } and gets new VueRouter({this.routes});
    * gets translations;
    * inits application `Vue()` from schema.info, this.router, Vuex.Store args and emits 'app.afterInit' with {app: this};

3. Application mounted.


There is a flowchart representing application initialization process(signal names have red font):

.. mermaid::

    graph TD
      CheckCachedVersion--New App Version-->CleanAllCache;
      CheckCachedVersion--Same App Version-->GetSchema;
      CleanAllCache-->CheckCachedVersion
      GetSchema--'openapi.loaded'-->AppConfiguration
      AppConfiguration--Centrifugo Client-->Centrifugo(Load Centrifugo)
      AppConfiguration--No Centrifugo-->LoadTranslation
      Centrifugo-->LoadTranslation
      LoadTranslation-->api.LoadUser-->GetCurrentUser
      GetCurrentUser-->PrepareFieldClasses
      PrepareFieldClasses-->ModelsResolver
      subgraph Models generation
      ModelsResolver--All Models Created-->B('allModels.created'):::classSignal
      ModelsResolver--Not All Models Created-->CreateModel
      CreateModel(CreateModel)-->SignalBeforeInit("'models#91;modelName#93;.fields.beforeInit'"):::classSignal-->CreateFields
      CreateFields-->SignalAfterInit("'models#91;modelName#93;.fields.afterInit'"):::classSignal-->modelsmodelName.created:::classSignal
      modelsmodelName.created-->ModelsResolver
      end
      ViewConstructor.generateViews--'allViewsCreated'-->QuerySetResolver
      QuerySetResolver--finds approppriate querySet-->global_components.registerAll
      global_components.registerAll--registers Vue `global_components-->prepare
      prepare--'app.beforeInit'-->StoreConstructor
      StoreConstructor--'app.beforeInitStore'-->RouterConstuctor
      RouterConstuctor--'app.beforeInitRouter'-->D(new VueRouter)
      D-->E(Vue Internationalization plugin)
      E-->F(new Vue Application)

    linkStyle 3 stroke:red,color:red
    linkStyle 13 stroke:red,color:red
    linkStyle 14 stroke:red,color:red
    linkStyle 16 stroke:red,color:red
    linkStyle 18 stroke:red,color:red
    linkStyle 21 stroke:red,color:red
    linkStyle 22 stroke:red,color:red
    linkStyle 23 stroke:red,color:red
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

    spa.signals.once("allViews.created", ({ views }) => {
      const AuthorListView = views.get("/author/");
      AuthorListView.mixins.push({
        computed: {
            // turn off breadcrumbs
          breadcrumbs() {
            return false;
          },
        },
      });
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


Basic data components
---------------------
If you want to add on page some component that gets data from API and displays it in some way, you can use
`spa.components.mixins.InstanceComponent` and `spa.components.mixins.InstancesComponent`. Both mixins expect you
to define at least `getQuerySet` method that will be called on component creation before data fetching.

Components based on mixins will have computed property `instance` or `instances` respectively.
It will be refreshed on every auto update.

Example component:

.. sourcecode:: HTML

    <template>
        <h1>Number of users: {{ count }}</h1>
    </template>
    <script>
        export default {
            mixins: [spa.components.mixins.InstancesComponent],
            computed: {
                uniqueName() {
                    return 'usersCounter';
                },
                count() {
                    return this.instances && this.instances.extra.count || 0;
                },
            },
            methods: {
                getQuerySet() {
                    return this.$app.views.get('/user/').objects.filter({ limit: 1 });
                },
            },
        };
    </script>

In given example store module with name `usersCounter` will be registered so data can be accessed globally.


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
