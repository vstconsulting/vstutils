Backend API manual
==================

VST Utils framework uses Django, Django Rest Framework, drf-yasg and Celery.

Models
------

A model is the single, definitive source of truth about your data. It contains essential fields and behavior for the data you’re storing.
Usually best practice is to avoid writing views and serializers manually,
as BModel provides plenty of Meta attributes to autogenerate serializers and views for many use cases.

.. automodule:: vstutils.models
    :members:

.. automodule:: vstutils.models.queryset
    :members:

.. automodule:: vstutils.models.decorators
    :members: register_view_action


You can also use custom models without using database:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. automodule:: vstutils.custom_model
    :members: ListModel,FileModel

Model Fields
~~~~~~~~~~~~

.. automodule:: vstutils.models.fields
    :members:


Web API
-------

Web API is based on Django Rest Framework with additional nested functions.

Fields
~~~~~~

The Framework includes a list of convenient serializer fields. Some of them take effect only in generated admin interface.

.. automodule:: vstutils.api.fields
    :members:

Validators
~~~~~~~~~~

There are validation classes for fields.

.. automodule:: vstutils.api.validators
    :members:

Serializers
~~~~~~~~~~~

.. automodule:: vstutils.api.serializers
    :members: BaseSerializer,VSTSerializer,EmptySerializer,JsonObjectSerializer

Views
~~~~~

.. automodule:: vstutils.api.base
    :members: GenericViewSet,ModelViewSet,ReadOnlyModelViewSet,HistoryModelViewSet,CopyMixin,FileResponseRetrieveMixin

.. automodule:: vstutils.api.decorators
    :members: nested_view,subaction


Filtersets
~~~~~~~~~~

For greater development convenience, the framework provides additional classes
and functions for filtering elements by fields.

.. automodule:: vstutils.api.filters
    :members:


Responses
~~~~~~~~~

DRF provides a standard set of variables whose names correspond to
the human-readable name of the HTTP code.
For convenience, we have dynamically wrapped it in a set of classes
that have appropriate names and additionally provides following capabilities:

- String responses are wrapped in json like ``{ "detail": "string response" }``.
- Attribute timings are kept for further processing in middlewares.
- Status code is set by class name (e.g. ``HTTP_200_OK`` or ``Response200`` has code 200).

All classes inherit from:

.. automodule:: vstutils.api.responses
    :members: BaseResponseClass


Middlewares
~~~~~~~~~~~

By default, Django `supposes <https://docs.djangoproject.com/en/3.2/topics/http/middleware/#writing-your-own-middleware>`_
that a developer creates Middleware class manually, but it's often a routine.
The vstutils library offers a convenient request handler class for elegant OOP development.
Middleware is used to process incoming requests and send responses before they reach final destination.

.. automodule:: vstutils.middleware
    :members: BaseMiddleware

Filter Backends
~~~~~~~~~~~~~~~
`Filter Backends <https://www.django-rest-framework.org/api-guide/filtering/#djangofilterbackend>`_ are used to modify model queryset.
To create custom filter backend to, (i.g. annotate model queryset), you should inherit from :class:vstutils.api.filter_backends.VSTFilterBackend
and override :meth:vstutils.api.filter_backends.VSTFilterBackend.filter_queryset and in some cases
:meth:vstutils.api.filter_backends.VSTFilterBackend.get_schema_fields.

.. automodule:: vstutils.api.filter_backends
    :members:

Celery
------

Celery is a distributed task queue. It's used to execute some actions asynchronously in a separate worker.
For more details on Celery, check it's official `docs <https://docs.celeryproject.org/en/stable/>`_.
For Celery related vstutils features to work, you need to specify `[rpc] <config.html#rpc-settings>`_ and
`[worker] <config.html#worker-settings>`_ sections in settings.ini. Also you need to include extra [rpc] requirements.

Tasks
~~~~~

.. automodule:: vstutils.tasks
    :members: TaskClass

Endpoint
--------

Endpoint view has two purposes: bulk requests execution and providing openapi schema.

Endpoint url is ``/{API_URL}/endpoint/``, for example value with default settings is ``/api/endpoint/``.

``API_URL`` can be changed in ``settings.py``.

.. automodule:: vstutils.api.endpoint
    :members: EndpointViewSet


Bulk requests
~~~~~~~~~~~~~

Bulk request allows you send multiple reques`t to api at once, it accepts json list of operations.

+-----------------------------------+--------------------+--------------------------+
| Method                            | Transactional      | Synchronous              |
|                                   | (all operations in | (operations executed one |
|                                   | one transaction)   | by one in given order)   |
+===================================+====================+==========================+
| ``PUT /{API_URL}/endpoint/``      | NO                 | YES                      |
+-----------------------------------+--------------------+--------------------------+
| ``POST /{API_URL}/endpoint/``     | YES                | YES                      |
+-----------------------------------+--------------------+--------------------------+
| ``PATCH /{API_URL}/endpoint/``    | NO                 | NO                       |
+-----------------------------------+--------------------+--------------------------+

Parameters of one operation (required parameter marked by :superscript:`*`):

* ``method``:superscript:`*` - http method of request
* ``path``:superscript:`*` - path of request, can be ``str`` or ``list``
* ``data`` - data to send
* ``query`` - query parameters as ``str``
* ``let`` - string with name of variable (used for access to response result in templates)
* ``headers`` - ``dict`` with headers which will be sent, names of headers must
  follow `CGI specification <https://www.w3.org/CGI/>`_ (e.g., ``CONTENT_TYPE``, ``GATEWAY_INTERFACE``, ``HTTP_*``).
* ``version`` - ``str`` with specified version of api, if not provided then ``VST_API_VERSION`` will be used

In any request parameter you can insert result value of previous operations
(``<<{OPERATION_NUMBER or LET_VALUE}[path][to][value]>>``), for example:

.. code-block::

    [
        {"method": "post", "path": "user", "data": {"name": "User 1"}),
        {"method": "delete", "version": "v2", "path": ["user", "<<0[data][id]>>"]}
    ]

Result of bulk request is json list of objects for operation:

* ``method`` - http method
* ``path`` - path of request, always str
* ``data`` - data that needs to be sent
* ``status`` - response status code

Transactional bulk request returns ``502 BAG GATEWAY`` and does rollback after first failed request.

.. warning::
    If you send non-transactional bulk request, you will get ``200`` status and must
    validate statuses on each operation responses.

Openapi schema
~~~~~~~~~~~~~~

Request on ``GET /{API_URL}/endpoint/`` returns Swagger UI.

Request on ``GET /{API_URL}/endpoint/?format=openapi`` returns openapi schema in json format. Also you can specify required
version of schema using ``version`` query parameter (e.g., ``GET /{API_URL}/endpoint/?format=openapi&version=v2``).

To change the schema after generating and before sending to user use hooks.
Define one or more function, each taking 2 named arguments:

* ``request`` - user request object.
* ``schema`` - ordered dict with openapi schema.

.. note::
    Sometimes hooks may raise an exception;
    in order to keep a chain of data modification,
    such exceptions are handled.
    The changes made to the schema before the exception however, are saved.

Example hook:
    .. sourcecode:: python

        def hook_add_username_to_guiname(request, schema):
            schema['info']['title'] = f"{request.username} - {schema['info']['title']}"

To connect hook(s) to your app add function import name to the ``OPENAPI_HOOKS`` list in ``settings.py``

.. code-block::

    OPENAPI_HOOKS = [
        '{{appName}}.openapi.hook_add_username_to_guiname',
    ]


Testing Framework
-----------------

VST Utils Framework includes a helper in base testcase class and
improves support for making API requests. That means if you want make bulk request
to endpoint you dont need create and init test client, but just need to call:

.. sourcecode:: python

    endpoint_results = self.bulk([
        # list of endpoint requests
    ])

Creating test case
~~~~~~~~~~~~~~~~~~
``test.py`` module contains testcase classes based on :class:`vstutils.tests.BaseTestCase`.
At the moment, we officially support two styles of writing tests:
classic and simple query wrappers with run check and
runtime optimized bulk queries with manual value checking.


Simple example with classic tests
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

For example, if you have api endpoint like ``/api/v1/project/`` and model Project
you can write testcase like this:

.. sourcecode:: python

    from vstutils.tests import BaseTestCase


    class ProjectTestCase(BaseTestCase):
        def setUp(self):
            super(ProjectTestCase, self).setUp()
            # init demo project
            self.initial_project = self.get_model_class('project.Test').objects.create(name="Test")

        def tearDown(self)
            super(ProjectTestCase, self).tearDown()
            # remove it after test
            self.initial_project.delete()

        def test_project_endpoint(self):
            # Test checks that api returns valid values
            self.list_test('/api/v1/project/', 1)
            self.details_test(
                ["project", self.initial_project.id],
                name=self.initial_project.name
            )
            # Try to create new projects and check list endpoint
            test_data = [
                {"name": f"TestProject{i}"}
                for i in range(2)
            ]
            id_list = self.mass_create("/api/v1/project/", test_data, 'name')
            self.list_test('/api/v1/project/', 1 + len(id_list))


This example demonstrates functionality of default test case class.
Default projects are initialized for the fastest and most efficient result.
We recommend to divide tests for different entities into different classes.
This example demonstrate classic style of testing,
but you can use bulks in your test cases.


Bulk requests in tests
~~~~~~~~~~~~~~~~~~~~~~

Bulk query system is well suited for testing and executing valid queries.
Previous example could be rewritten as follows:

.. sourcecode:: python

    from vstutils.tests import BaseTestCase


    class ProjectTestCase(BaseTestCase):
        def setUp(self):
            super(ProjectTestCase, self).setUp()
            # init demo project
            self.initial_project = self.get_model_class('project.Test').objects.create(name="Test")

        def tearDown(self)
            super(ProjectTestCase, self).tearDown()
            # remove it after test
            self.initial_project.delete()

        def test_project_endpoint(self):
            test_data = [
                {"name": f"TestProject{i}"}
                for i in range(2)
            ]
            bulk_data = [
                {"method": "get", "path": ["project"]},
                {"method": "get", "path": ["project", self.initial_project.id]}
            ]
            bulk_data += [
                {"method": "post", "path": ["project"], "data": i}
                for i in test_data
            ]
            bulk_data.append(
                {"method": "get", "path": ["project"]}
            )
            results = self.bulk_transactional(bulk_data)

            self.assertEqual(results[0]['status'], 200)
            self.assertEqual(results[0]['data']['count'], 1)
            self.assertEqual(results[1]['status'], 200)
            self.assertEqual(results[1]['data']['name'], self.initial_project.name)

            for pos, result in enumerate(results[2:-1]):
                self.assertEqual(result['status'], 201)
                self.assertEqual(result['data']['name'], test_data[pos]['name'])

            self.assertEqual(results[-1]['status'], 200)
            self.assertEqual(results[-1]['data']['count'], 1 + len(test_data))


In this case, you have more code, but your tests are closer to GUI workflow,
because vstutils-projects uses ``/api/endpoint/`` for requests.
Either way, bulk queries are much faster due to optimization;
Testcase execution time is less comparing to non-bulk requests.


Test case API
~~~~~~~~~~~~~

.. automodule:: vstutils.tests
    :members: BaseTestCase


Utils
-----

This is tested set of development utilities.
Utilities include a collection of code that will be useful
in one way or another for developing the application.
Vstutils uses mosts of these functions under the hood.

.. automodule:: vstutils.utils
    :members:
