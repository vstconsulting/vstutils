Backend API manual
==================

VST Utils framework consolidates such frameworks as Django, Django Rest Framework, drf-yasg and Celery.
Below are descriptions of some features used in the development of projects based on vstutils.


Models
------

A model is the single, definitive source of truth about your data. It contains the essential fields and behaviors of the data you’re storing.
The goal is to define your data model in one place and automatically derive things from it.
You can also define everything you need to get the generated view from the model.

.. automodule:: vstutils.models
    :members:

.. automodule:: vstutils.models.decorators
    :members: register_view_action


Also you can use custom models without using database:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. automodule:: vstutils.custom_model
    :members: ListModel,FileModel


Utils
-----

This is some tested set of development utilities.
Utilities include a collection of some code that will be useful
in one way or another to develop the application.
Most of the functions are used by vstutils itself.

.. automodule:: vstutils.utils
    :members:


Web API
-------

Web API is based on Django Rest Framework with some nested functions.

Fields
~~~~~~

There is additional fields which extends API and GUI. Also, it would be usefull
for customizing frontend view without write any JS code.

.. automodule:: vstutils.api.fields
    :members:

There is useful validation classes for fields.

.. automodule:: vstutils.api.validators
    :members:

Serializers
~~~~~~~~~~~

.. automodule:: vstutils.api.serializers
    :members: VSTSerializer,EmptySerializer,JsonObjectSerializer

Views
~~~~~

.. automodule:: vstutils.api.base
    :members: ModelViewSet,ReadOnlyModelViewSet,HistoryModelViewSet,CopyMixin

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

Openapi schema
~~~~~~~~~~~~~~

Request on ``GET /{API_URL}/endpoint/`` returns Swagger UI.

Request on ``GET /{API_URL}/endpoint/?format=openapi`` returns json openapi schema. Also you can specify required
version of schema using ``version`` query parameter (e.g., ``GET /{API_URL}/endpoint/?format=openapi&version=v2``).
