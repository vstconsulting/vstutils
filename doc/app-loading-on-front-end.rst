Application loading on front-end
================================
Loading of VST Utils application on client is done by **app-loader.js** script.

Application loading steps
-------------------------
To load application **app-loader.js** is going through following steps:

    1. loading of app's dependencies (via :ref:`app-dependencies-loader-class`):

        * OpenAPI schema;
        * static files (JS, CSS, TPl);
    2. creating of app instance (:ref:`app-class`) and saving it to the global 'app' variable;
    3. invoking of :ref:`app.start() <app-class-start-method>` method.
       This method initiates :doc:`parsing of OpenAPI schema and generating of front-end Models and Views </openapi-schema-parsing>`
       and mounts root Vue instance to the DOM, after all :ref:`Models objects <model-class>` and :ref:`Views objects <view-class>` was generated.

Optimization of application loading
-----------------------------------
VST Utils tries to load your application as fast as possible,
that's why VST Utils uses Service Worker and IndexedDB during its work.

Service Worker is used for caching of:

* static files (CSS, JS, fonts, images);
* offline fallback page (offline.html).

Service worker is a great tool, that does all dirty things with caching for us,
but, unfortunately, it works only if application is working on the host with HTTPS.

We can't be enough sure, that all applications, based on VST Utils, will be always working under HTTPS,
that why we also use IndexedDB for caching the most heavy API requests.

IndexedDB is used for caching of:

* OpenAPI schema;
* list of available interface languages (interface localization);
* dicts with translations for different languages.

Service Worker and IndexedDB will store this cache while application version is staying the same.
Once application version changed, Service Worker and IndexedBD caches will automatically clean
and application will load new OpenAPI schema, new static files and so on.
That's why the longest application loading will be, when user loads application of new version.
Each time user tries to load application of the same version as he loaded before,
application will be loading much faster, than at the first time,
because of using Service Worker and IndexedDB caches.


.. _files-cache-class:

FilesCache class
----------------
FilesCache is an abstraction, that is responsible for setting/getting files' content (strings, json - transformed to string) to/from cache.
In current realization of VST Utils cache is stored in the `IndexedDB <https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Concepts_Behind_IndexedDB>`_ .

Properties:
~~~~~~~~~~~

* **indexed_db** - object - realization of IndexedDB in current browser.
* **db_name** - string - name of database.
* **db_version** - number - version of database.
* **store_name** - string - name of database's store.

Methods:
~~~~~~~~

constructor(opt={})
"""""""""""""""""""
**Arguments:**

* opt: {object} - object with options for FilesCache instance, that can redefine some base properties of instance.

**Description:** Standard constructor of JS class.
This method creates new FilesCache instance with current arguments.

connectDB()
"""""""""""
**Description:** Method, that returns promise of getting connection to current instance's database.

getFile(file_name)
""""""""""""""""""
**Arguments:**

* file_name: {string} - |file_func_file_name_arg_def|

.. |file_func_file_name_arg_def| replace:: Name of file.

**Description:** Method, that returns promise to get file from FilesCache instance's database.

setFile(file_name, file_data)
"""""""""""""""""""""""""""""
**Arguments:**

* file_name: {string} - |file_func_file_name_arg_def|
* file_data: {string} - Content of file.

**Description:** Method, that returns promise to save file in FilesCache instance's database.

delFile(file_name)
""""""""""""""""""
**Arguments:**

* file_name: {string} - |file_func_file_name_arg_def|

**Description:** Method, that returns promise to delete file from FilesCache instance's database.

deleteAllCache()
""""""""""""""""
**Description:** Method, that returns promise to delete all files from FilesCache instance's database
(delete FilesCache instance's database).


.. _app-dependencies-loader-class:

AppDependenciesLoader class
---------------------------
AppDependenciesLoader is an abstraction, that is responsible for loading of App dependencies (OpenAPI schema, static files) and appending them to the page.
Also this class has methods for creating and adding to the page 'Loader block' - DOM element, that collects loading logs and shows status of app dependencies loading.
This class loads only app's dependencies, it does not create/load app instance.

Properties:
~~~~~~~~~~~

* **openApiLoader** - Object, that has methods for loading of OpenAPI schema. Instance of :ref:`open-api-loader-class`.
* **filesLoader** - Object, that has methods for loading of static files (js, css, tpl) and appending them to the page. Instance of :ref:`static-files-loader-class`.
* **loading** - Boolean property, that means is loader loading something from outer resources right now or not.
* **errors** - Array, that collects errors occurred during app's dependencies loading.

Methods:
~~~~~~~~

constructor(resource_list, cache)
"""""""""""""""""""""""""""""""""
**Arguments:**

* resource_list: {array} - |list_resource_list_def|
* cache: {object} - Object, that has methods for manipulating with cache. It is supposed to be instance of :ref:`files-cache-class`.

**Description:** Standard constructor of JS class.
This method creates new AppDependenciesLoader instance with current arguments.

addLoaderBlockToPage()
""""""""""""""""""""""
**Description:** Method creates and adds to the page root DOM element, that will show loading status and collect loading logs.
This DOM element has children elements:

* loading status;
* loading progress bar;
* reload cache button;
* project info table (will be shown only if some error occurs);
* loading logs wrapper (will be shown only if some error occurs).

formLogsWrapper()
"""""""""""""""""
**Description:** Method, that forms DOM elements, which will store loading logs.

formProjectInfoTable()
""""""""""""""""""""""
**Description:** Method forms DOM element - table, that stores info about project.

setLoadingOperation(operation)
""""""""""""""""""""""""""""""
**Arguments:**

* operation: {string} - String with name of loading operation.

**Description:** Method sets current loading operation to one of the children DOM elements of Loader block.

showLoadingAnimation()
""""""""""""""""""""""
**Description:** Method shows loading animation while some dependencies are loading from server.

setLoadingProgress(width)
"""""""""""""""""""""""""
**Arguments:**

* width: {number} - Value of loading progress bar width.

**Description:** Method, that changes loading progress bar value.

hideLoaderBlock()
"""""""""""""""""
**Description:** Method, that firstly hides loader block and then removes it from the DOM.

appendLog(data, extendData)
"""""""""""""""""""""""""""
**Arguments:**

* data: {object | string} - Logging message.
* extendData: {object} - Additional logging message.

**Description:** Method, that adds logs of files loading.

appendError(exception, extendData)
""""""""""""""""""""""""""""""""""
**Arguments:**

* exception: {object | string} - Error object or string.
* extendData: {object} - Additional logging message.

**Description:** Method, that adds to the html document info about file loading error.

showUpdatingAppVersionMessage()
"""""""""""""""""""""""""""""""
**Description:** Method shows message about updating of app version.

loadAndAppendDependencies()
"""""""""""""""""""""""""""
**Description:** Method returns promise to load all dependencies and append them to the page.
Main method of current class. This method creates and add to the page DOM element,
that shows loading status and collects loading logs,
loads app dependencies(OpenAPI schema, static files) and appends them to the page.

loadDependencies()
""""""""""""""""""
**Description:** Method returns promise to load all app's dependencies.

appendDependencies(dependencies)
""""""""""""""""""""""""""""""""
**Arguments:**

* dependencies: {array} - Response array, connecting loaded OpenAPI schema and files.

**Description:** Method returns promise to append dependencies(static files) to the page.


.. _open-api-loader-class:

OpenApiLoader class
-------------------
OpenApiLoader is an abstraction, that is responsible for loading of OpenAPI schema.
OpenApiLoader has methods for loading of OpenAPI schema from API as well as from cache.

Properties:
~~~~~~~~~~~

* **cache** - object, that manages operations connected with caching of API responses. It is supposed to be instance of :ref:`files-cache-class`.

Methods:
~~~~~~~~

constructor(cache)
""""""""""""""""""
**Arguments:**

* cache: {object} - object, that manages operations connected with caching of API responses. It is supposed to be instance of :ref:`files-cache-class`.

**Description:** Standard constructor of JS class.
This method creates new OpenApiLoader instance with current arguments.

loadSchema()
""""""""""""
**Description:** Method, that promises to load OpenApi schema.
According to the situation it loads OpenAPI schema from API or from cache.

loadSchemaFromApi()
"""""""""""""""""""
**Description:** Method, that promises to load OpenApi schema from API.

loadSchemaFromCache()
"""""""""""""""""""""
**Description:** Method, that promises to load OpenApi schema from cache.


.. _static-files-loader-class:

StaticFilesLoader class
-----------------------
StaticFilesLoader is an abstraction, that is responsible for the loading of app's static files (js, css, tpl)
and appending them to the DOM.

Properties:
~~~~~~~~~~~

* **resource_list** - |list_resource_list_def|

.. |list_resource_list_def| replace:: array, with objects, containing info about static files, that should be loaded (name(url), type, priority).

Methods:
~~~~~~~~

constructor(resource_list)
""""""""""""""""""""""""""
**Arguments:**

* resource_list: {array} - |list_resource_list_def|

**Description:** Standard constructor of JS class.
This method creates new StaticFilesLoader instance with current arguments.

loadAllFiles()
""""""""""""""
**Description:** Method, that loads all files form resource_list. Method returns promise of files loading.

checkAllFilesLoaded(response)
"""""""""""""""""""""""""""""
**Arguments:**

* response: {array} - |list_of_responses_of_files_loading_requests_def|

**Description:** Method checks, that all files were loaded with 200 status.

appendFilesSync(response, index, callbacks)
"""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* response: {array} - |list_of_responses_of_files_loading_requests_def|
* index: {number} - List index of element from resource list and response arrays.
* callbacks: {object} - Dict with callbacks.

.. |list_of_responses_of_files_loading_requests_def| replace:: List of responses on files loading requests.

**Description:** Method, that appends files synchronously (in 'priority' order) to the page.
Firstly, current method adds to the page file with '0' index, then it appends file with '1' index and so on.

appendFile_js(file, content)
""""""""""""""""""""""""""""
**Arguments:**

* file: {object} - |append_file_file_arg_def|
* content: {string} - |append_file_content_arg_def|

.. |append_file_file_arg_def| replace:: Object with file properties (type, name(url)).
.. |append_file_content_arg_def| replace:: File's content.

**Description:** Method, that appends JS type file to the page.

appendFile_css(file, content)
"""""""""""""""""""""""""""""
**Arguments:**

* file: {object} - |append_file_file_arg_def|
* content: {string} - |append_file_content_arg_def|

**Description:** Method, that appends CSS type file to the page.

appendFile_tpl(file, content)
"""""""""""""""""""""""""""""
**Arguments:**

* file: {object} - |append_file_file_arg_def|
* content: {string} - |append_file_content_arg_def|

**Description:** Method, that appends TPL type file to the page.
