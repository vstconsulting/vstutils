Backend API manual
==================

VST Utils framework consolidates such frameworks as Django, Django Rest Framework, drf-yasg and Celery.
Below are descriptions of some features used in the development of projects based on vstutils.


Models
------

A model is the single, definitive source of truth about your data. It contains the essential fields and behaviors of the data you’re storing.
Usually best practice is to avoid writing views and serializers manually,
BModel provides plenty of Meta attributes to autogenerate serializers and views for almost any usecase.

.. automodule:: vstutils.models
    :members:

.. automodule:: vstutils.models.queryset
    :members:

.. automodule:: vstutils.models.decorators
    :members: register_view_action


Also you can use custom models without using database:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. automodule:: vstutils.custom_model
    :members: ListModel,FileModel


Web API
-------

Web API is based on Django Rest Framework with some nested functions.

Fields
~~~~~~

The Framework includes a list of convenient serializer fields. Some of them take effect only in generated admin interface.

.. automodule:: vstutils.api.fields
    :members:

Validators
~~~~~~~~~~

There is useful validation classes for fields.

.. automodule:: vstutils.api.validators
    :members:

Serializers
~~~~~~~~~~~

.. automodule:: vstutils.api.serializers
    :members: BaseSerializer,VSTSerializer,EmptySerializer,JsonObjectSerializer

Views
~~~~~

.. automodule:: vstutils.api.base
    :members: ModelViewSet,ReadOnlyModelViewSet,HistoryModelViewSet,CopyMixin,FileResponseRetrieveMixin

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
For convenience, we have dynamically wrapped this in a set of classes
that have appropriate names and additionally provide the following capabilities:

- String responses are wrapped in json like ``{ "detail": "string response" }``.
- Keep attribute timings for further processing in middlewares.
- Set status code from class name (e.g. ``HTTP_200_OK`` or ``Response200`` got code 200).

All classes inherit from:

.. automodule:: vstutils.api.responses
    :members: BaseResponseClass


Middlewares
~~~~~~~~~~~

By default, the Django `assumes <https://docs.djangoproject.com/en/2.2/topics/http/middleware/#writing-your-own-middleware>`_
that the developer will develop itself Middleware class, but it is not always convenient.
The vstutils library offers a convenient request handler class for elegant OOP development.
Middlewares is needed to process incoming requests and sent responses before they reach the final destination.

.. automodule:: vstutils.middleware
    :members: BaseMiddleware


Endpoint
--------

Endpoint view has two purposes: bulk requests execution and providing openapi schema.

Endpoint url is ``/{API_URL}/endpoint/``, for example value with default settings is ``/api/endpoint/``.

``API_URL`` can be changed in ``settings.py``.

.. automodule:: vstutils.api.endpoint
    :members: EndpointViewSet


Bulk requests
~~~~~~~~~~~~~

Bulk request allows you send multiple request to api at once, it accepts json list of operations.

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

Parameters of one operation (:superscript:`*` means that parameter is required):

* ``method``:superscript:`*` - http method of request
* ``path``:superscript:`*` - path of request, can be ``str`` or ``list``
* ``data`` - data that needs to be sent
* ``query`` - query parameters as ``str``
* ``headers`` - ``dict`` with headers which will be sent, names of headers must
  follow `CGI specification <https://www.w3.org/CGI/>`_ (e.g., ``CONTENT_TYPE``, ``GATEWAY_INTERFACE``, ``HTTP_*``).
* ``version`` - ``str`` with specified version of api, if not provided then ``VST_API_VERSION`` will be used

In any request parameter you can insert result value of previous operations
(``<<{OPERATION_NUMBER}[path][to][value]>>``), for example:

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

Transactional bulk request returns ``502 BAG GATEWAY`` and make rollback if one of requests is failed.

.. warning::
    If you send non-transactional bulk request, you will get ``200`` status and must
    validate statuses on each operation responses.

Openapi schema
~~~~~~~~~~~~~~

Request on ``GET /{API_URL}/endpoint/`` returns Swagger UI.

Request on ``GET /{API_URL}/endpoint/?format=openapi`` returns json openapi schema. Also you can specify required
version of schema using ``version`` query parameter (e.g., ``GET /{API_URL}/endpoint/?format=openapi&version=v2``).

Applying hooks to the schema can also be helpful.
This functionality will help to change certain data in the schema before it will be sended to user.
In order to set some hooks, it is enough to specify in ``settings.py`` the ``OPENAPI_HOOKS``
which is an array with lines for importing functions.
Each function will take 2 named arguments:

* ``request`` - user request object.
* ``schema`` - ordered dict with openapi schema.

.. note::
    Sometimes hooks may raise an exception,
    and in order not to break the chain of data modification,
    such exceptions are handled.
    However, the changes made to the schema before the raised exception will be saved.

Example hook:
    .. sourcecode:: python

        def hook_add_username_to_guiname(request, schema):
            schema['info']['title'] = f"{request.username} - {schema['info']['title']}"



Testing Framework
-----------------

VST Utils Framework includes a few helper in base testcase class and
improve support for making API requests. That means if you want make bulk request
to endpoint you dont need create and init test client, but just need to call:

.. sourcecode:: python

    endpoint_results = self.bulk([
        # list of endpoint requests
    ])

Creating test case
~~~~~~~~~~~~~~~~~~

After creating new project via ``vstutils`` you can found ``test.py`` module,
where you see testcase classes based on :class:`vstutils.tests.BaseTestCase`.
At the moment, we officially support two styles of writing tests:
through classic and simple query wrappers with run check and
through runtime optimized bulk queries with manual value checking.


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
            # Test checks that api return valid values
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


This simple example demonstrate functionality of default test case class.
Default projects are initialized in such a way that for the fastest and most efficient result
it is best to distribute testing of various entities into different classes.
This example demonstrate classic style of testing,
but you can use bulks in your test cases.


Bulk requests in tests
~~~~~~~~~~~~~~~~~~~~~~

The bulk query system and its capabilities are very well suited for testing and
executing valid queries.
Returning to the previous example, it could be rewritten as follows:

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


In this case, you have more code rows, but your tests will be closer to GUI workflow,
because vstutils-projects uses ``/api/endpoint/`` for requests.
Either way, bulk queries are much faster due to some optimizations,
so you can reduce testcase execution time.


Test case API
~~~~~~~~~~~~~

.. automodule:: vstutils.tests
    :members: BaseTestCase


Utils
-----

This is some tested set of development utilities.
Utilities include a collection of some code that will be useful
in one way or another to develop the application.
Most of the functions are used by vstutils itself.

.. automodule:: vstutils.utils
    :members:
