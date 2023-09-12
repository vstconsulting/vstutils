import typing as _t

from django.db import transaction
from django.http.response import FileResponse
from rest_framework import serializers, viewsets
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.utils.serializer_helpers import ReturnDict, ReturnList
from drf_yasg.utils import swagger_auto_schema

from .responses import HTTP_200_OK, HTTP_201_CREATED, HTTP_204_NO_CONTENT
from .serializers import EmptySerializer, DataSerializer
from .pagination import SimpleCountedListPagination


class DummyAtomic:
    __slots__ = ()

    def __init__(self, *args, **kwargs):
        ...

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        ...


class Action:
    """
    Base class of actions. Has minimal of required functionality to create an action and write only business logic.
    This decorator is suitable in cases where it is not possible to implement the logic using :class:`.SimpleAction`
    or the algorithm is much more complicated than standard CRUD.

    Examples:

       .. sourcecode:: python

        ...
        from vstutils.api.fields import VSTCharField
        from vstutils.api.serializers import BaseSerializer
        from vstutils.api.base import ModelViewSet
        from vstutils.api.actions import Action
        ...

        class RequestSerializer(BaseSerializer):
            data_field1 = ...
            ...


        class ResponseSerializer(BaseSerializer):
            detail = VSTCharField(read_only=True)


        class AuthorViewSet(ModelViewSet):
            model = ...
            ...

            @Action(serializer_class=RequestSerializer, result_serializer_class=ResponseSerializer, ...)
            def profile(self, request, *args, **kwargs):
                ''' Got `serializer_class` body and response with `result_serializer_class`. '''
                serializer = self.get_serializer(self.get_object(), data=request.data)
                serializer.is_valid(raise_exception=True)
                return {"detail": "Executed!"}



    :param detail: Flag indicating which type of action is used: on a list or on a single entity.
                   Affects where this action will be displayed - on a detailed record or on a list of records.
    :param methods: List of available HTTP-methods for this action. Default has only `POST` method.
    :param serializer_class: Request body serializer. Also used for default response.
    :param result_serializer_class: Response body serializer. Required, when request and response
                                    has different set of fields.
    :param query_serializer: GET-request query data serializer. It is used when it is necessary to get valid data
                             in the query data of a GET-request and cast it to the required type.
    :param multi: Used only with non-GET requests and notify GUI, that this action
                  should be rendered over the selected list items.
    :param title: Title for action in UI. For non-GET actions, title is generated from method's name.
    :param icons: List of icons for UI button.
    :param is_list: Flag indicating whether the action type is a list or a single entity.
                    Typically used with GET actions.
    :param kwargs: Set of named arguments for :func:`rest_framework.decorators.action`.

    """
    __slots__ = (
        'detail',
        'methods',
        'serializer_class',
        'result_serializer_class',
        'query_serializer',
        'action_kwargs',
        'multi',
        'title',
        'icons',
        'is_list',
        'hidden',
    )
    method_response_mapping = {
        "HEAD": HTTP_200_OK,
        "GET": HTTP_200_OK,
        "PUT": HTTP_200_OK,
        "PATCH": HTTP_200_OK,
        "POST": HTTP_201_CREATED,
        "DELETE": HTTP_204_NO_CONTENT,
    }

    def __init__(  # noqa: CFQ002
        self,
        detail: bool = True,
        methods: _t.List[_t.Text] = None,
        serializer_class: _t.Type[serializers.Serializer] = DataSerializer,
        result_serializer_class: _t.Type[serializers.Serializer] = None,
        query_serializer: _t.Type[serializers.Serializer] = None,
        multi: bool = False,
        title: _t.Text = None,
        icons: _t.Union[_t.Text, _t.Iterable] = None,
        is_list: bool = False,
        hidden: bool = False,
        **kwargs,
    ):
        # pylint: disable=too-many-arguments
        self.detail = detail
        self.methods = list(map(str.upper, methods or ['POST'])) or None
        self.serializer_class = serializer_class
        self.result_serializer_class = result_serializer_class
        self.query_serializer = query_serializer
        self.multi = multi
        self.title = title
        self.icons = icons
        self.is_list = is_list
        self.hidden = hidden
        self.action_kwargs = kwargs
        self.action_kwargs.setdefault('pagination_class', SimpleCountedListPagination if is_list else None)
        if self.query_serializer:
            self.action_kwargs['query_serializer'] = self.query_serializer

    @property
    def is_page(self):
        return 'GET' in self.methods

    def wrap_function(self, func):
        res = action(
            detail=self.detail,
            serializer_class=self.serializer_class,
            methods=self.methods,
            **self.action_kwargs
        )(func)

        name = func.__name__.replace('_', ' ').capitalize()
        swagger_kwargs = {
            'operation_description': (func.__doc__ or name).strip(),
            'methods': self.methods,
            'x-multiaction': self.multi if not self.is_page else False,
            'x-title': self.title or (None if self.is_page else name),
            'x-hidden': self.hidden,
        }
        if self.query_serializer:
            swagger_kwargs['query_serializer'] = self.query_serializer
        if self.icons:
            swagger_kwargs['x-icons'] = self.icons.split(' ') if isinstance(self.icons, _t.Text) else list(self.icons)
        if self.is_page:
            swagger_kwargs['x-list'] = self.is_list

        res = swagger_auto_schema(**swagger_kwargs)(res)
        res.action = self
        res.__doc__ = swagger_kwargs['operation_description']
        return res

    def __call__(self, method):

        def action_method(
                view: viewsets.GenericViewSet,
                request: Request,
                *args,
                **kwargs,
        ) -> _t.Union[Response, FileResponse]:

            result_serializer_class: _t.Type[serializers.Serializer] = self.result_serializer_class
            identical = False
            if result_serializer_class is None:
                result_serializer_class = view.get_serializer_class()
                identical = True

            result = method(view, request, *args, **kwargs)
            response_class = self.method_response_mapping[_t.cast(_t.Text, request.method)]

            if issubclass(result_serializer_class, serializers.Serializer):
                if not (isinstance(result, (ReturnDict, ReturnList)) and identical):
                    serializer = result_serializer_class(
                        result,
                        many=self.is_list,
                        context=view.get_serializer_context()
                    )
                    result = serializer.data
            elif isinstance(result, FileResponse):
                return result

            if self.is_list and (paginator := view.paginator):
                result = paginator.get_paginated_response(result).data
            return response_class(result)

        action_method.__name__ = self.action_kwargs.get('name', method.__name__)
        action_method.__doc__ = method.__doc__
        return self.wrap_function(action_method)


class EmptyAction(Action):
    """
    In this case, actions on an object do not require any data and manipulations with them.
    For such cases, there is a standard method that allows you to simplify
    the scheme and code to work just with the object.

    Optionally, you can also overload the response serializer
    to notify the interface about the format of the returned data.


    Examples:

       .. sourcecode:: python

        ...
        from vstutils.api.fields import RedirectIntegerField
        from vstutils.api.serializers import BaseSerializer
        from vstutils.api.base import ModelViewSet
        from vstutils.api.actions import EmptyAction
        ...

        class ResponseSerializer(BaseSerializer):
            id = RedirectIntegerField(operation_name='sync_history')


        class AuthorViewSet(ModelViewSet):
            model = ...
            ...

            @EmptyAction(result_serializer_class=ResponseSerializer, ...)
            def sync_data(self, request, *args, **kwargs):
                ''' Example of action which get object, sync data and redirect user to another view. '''
                sync_id = self.get_object().sync().id
                return {"id": sync_id}


       .. sourcecode:: python

        ...
        from django.http.response import FileResponse
        from vstutils.api.base import ModelViewSet
        from vstutils.api.actions import EmptyAction
        ...

        class AuthorViewSet(ModelViewSet):
            model = ...
            ...

            @EmptyAction(result_serializer_class=ResponseSerializer, ...)
            def resume(self, request, *args, **kwargs):
                ''' Example of action which response with generated resume in pdf. '''
                instance = self.get_object()

                return FileResponse(
                    streaming_content=instance.get_pdf(),
                    as_attachment=True,
                    filename=f'{instance.last_name}_{instance.first_name}_resume.pdf'
                )

    """

    __slots__ = ()

    def __init__(self, **kwargs):
        kwargs['serializer_class'] = EmptySerializer
        super().__init__(**kwargs)


class SimpleAction(Action):
    """
    The idea of this decorator is to get the full CRUD for the instance in a minimum of steps.
    The instance is the object that was returned from the method being decorated.
    The whole mechanism is very similar to the standard property decorator,
    with a description of a getter, setter, and deleter.

    If you're going to create an entry point for working with a single object, then you do not need to define methods.
    The presence of a getter, setter, and deleter will determine which methods will be available.

    In the official documentation of Django, an example is given with moving data
    that is not important for authorization to the Profile model.
    To work with such data that is outside the main model, there is this action object,
    which implements the basic logic in the most automated way.

    It covers most of the tasks for working with such data. By default, it has a GET method instead of POST.
    Also, for better organization of the code, it allows you to change the methods
    that will be called when modifying or deleting data.

    When assigning an action on an object, the list of methods is also filled with the necessary ones.

    Examples:

       .. sourcecode:: python

        ...
        from vstutils.api.fields import PhoneField
        from vstutils.api.serializers import BaseSerializer
        from vstutils.api.base import ModelViewSet
        from vstutils.api.actions import Action
        ...

        class ProfileSerializer(BaseSerializer):
            phone = PhoneField()


        class AuthorViewSet(ModelViewSet):
            model = ...
            ...

            @SimpleAction(serializer_class=ProfileSerializer, ...)
            def profile(self, request, *args, **kwargs):
                ''' Get profile data to work. '''
                return self.get_object().profile

            @profile.setter
            def profile(self, instance, request, serializer, *args, **kwargs):
                instance.save(update_fields=['phone'])

            @profile.deleter
            def profile(self, instance, request, serializer, *args, **kwargs):
                instance.phone = ''
                instance.save(update_fields=['phone'])
    """
    __slots__ = ('extra_actions', 'atomic')

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('methods', ['GET'])
        self.atomic = bool(kwargs.pop('atomic', False))
        super().__init__(*args, **kwargs)
        self.extra_actions = {}

    def _get_transaction_context(self, request, *args, **kwargs):
        if self.atomic and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            return transaction.atomic(*args, **kwargs)
        return DummyAtomic(*args, **kwargs)

    def __call__(self, getter=None):
        self.extra_actions['get'] = getter

        def action_method(
                view: viewsets.GenericViewSet,
                request: Request,
                *args, **kwargs,
        ) -> Response:

            get_instance_method = self.extra_actions.get('get')

            with self._get_transaction_context(request):
                if get_instance_method:
                    method_kwargs: _t.Dict[_t.Text, _t.Any] = {'query_data': {}}
                    if request.method == "GET":
                        try:
                            method_kwargs['query_data'] = view.get_query_serialized_data(request)  # type: ignore
                        except (AttributeError, AssertionError):
                            pass
                    instance = get_instance_method(view, request, **method_kwargs)
                else:
                    instance = view.get_object() if not self.is_list else view.get_queryset()

                if request.method in {'POST', 'PUT', 'PATCH'}:
                    serializer = view.get_serializer(
                        instance,
                        data=request.data,
                        partial=request.method == 'PATCH',
                        many=self.is_list
                    )
                    serializer.is_valid(raise_exception=True)
                else:
                    if self.is_list and (paginator := view.paginator):
                        instance = paginator.paginate_queryset(queryset=instance, request=request, view=view)
                    serializer = view.get_serializer(instance, many=self.is_list)

                if request.method in {'POST', 'PUT', 'PATCH'}:
                    serializer.save()
                    if 'set' in self.extra_actions:
                        self.extra_actions['set'](view, instance, request, serializer, *args, **kwargs)
                    else:
                        instance.save()
                elif request.method == "DELETE":
                    if 'del' in self.extra_actions:
                        self.extra_actions['del'](view, instance, request, *args, **kwargs)
                    else:
                        instance.delete()

            return serializer.data

        action_method.__name__ = getter.__name__ if getter else self.action_kwargs['name']
        action_method.__doc__ = self.extra_actions['get'].__doc__
        resulted_action = super().__call__(action_method)

        def setter(setter_method):
            self.extra_actions['set'] = setter_method
            if 'PATCH' not in self.methods and 'PUT' not in self.methods:
                self.methods.append('PATCH')
                self.methods.append('PUT')
            setter_method.__name__ = f'{action_method.__name__}__setter'
            return self(self.extra_actions.get('get'))

        def deleter(deleter_method):
            self.extra_actions['del'] = deleter_method
            if 'DELETE' not in self.methods:
                self.methods.append('DELETE')
            deleter_method.__name__ = f'{action_method.__name__}__deleter'
            return self(self.extra_actions.get('get'))

        resulted_action.setter = setter
        resulted_action.deleter = deleter
        resulted_action.__doc__ = self.extra_actions['get'].__doc__
        return resulted_action
