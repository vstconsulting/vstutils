Backend API manual
==================

VST Utils framework consolidates such frameworks as Django, Django Rest Framework, drf-yasg and Celery.
Below are descriptions of some features used in the development of projects based on vstutils.


Models
------

.. automodule:: vstutils.models
    :members:

Also you can use custom models without uses DB:

.. automodule:: vstutils.custom_model
    :members: ListModel,FileModel


Utils
-----

.. automodule:: vstutils.utils
    :members:


Web API
-------

Web API is based on Django Rest Framework with some nested functions.

Fields
~~~~~~

.. automodule:: vstutils.api.fields
    :members:

Serializers
~~~~~~~~~~~

.. automodule:: vstutils.api.serializers
    :members: VSTSerializer,EmptySerializer,JsonObjectSerializer

Views
~~~~~

.. automodule:: vstutils.api.base
    :members: ModelViewSetSet,ReadOnlyModelViewSet,HistoryModelViewSet,CopyMixin

.. automodule:: vstutils.api.decorators
    :members: nested_view,subaction


Middlewares
~~~~~~~~~~~

By default, the Django `assumes <https://docs.djangoproject.com/en/2.2/topics/http/middleware/#writing-your-own-middleware>`_
that the developer will develop itself Middleware class, but it is not always convenient.
The vstutils library offers a convenient request handler class for elegant OOP development.
Middlewares is needed to process incoming requests and sent responses before they reach the final destination.

.. automodule:: vstutils.middleware
    :members: BaseMiddleware
