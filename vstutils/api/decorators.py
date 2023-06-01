# pylint: disable=protected-access
import typing as _t
from collections import OrderedDict
from inspect import getmembers

import orjson
from django.db import transaction
from rest_framework.decorators import action
from rest_framework import response, status
from drf_yasg.utils import swagger_auto_schema

from .filter_backends import DeepViewFilterBackend
from ..exceptions import VSTUtilsException
from .. import utils


empty = object()


def ensure_is_object(obj):
    if isinstance(obj, (str, bytes)):
        return orjson.loads(obj)
    return obj


def _is_extra_action(attr):
    return hasattr(attr, 'mapping')


def _create_with_iteration(view, get_serializer_func, nested_manager, data):
    serializer = get_serializer_func(data=data)
    serializer.is_valid(raise_exception=True)

    if hasattr(nested_manager, 'field'):
        # on fk relations
        serializer.validated_data[nested_manager.field.name] = nested_manager.instance
        view.perform_create(serializer)
        return serializer.instance

    elif hasattr(nested_manager, 'content_type_field_name'):
        # on contenttype relations
        content_type_field_name = nested_manager.content_type_field_name
        serializer.validated_data[content_type_field_name] = getattr(nested_manager, content_type_field_name)
        serializer.validated_data[nested_manager.object_id_field_name] = nested_manager.instance.id
        view.perform_create(serializer)
        return serializer.instance

    # other relations (many to many or custom with `.add()` method)
    with transaction.atomic():
        view.perform_create(serializer)
        nested_manager.add(serializer.instance)
    return serializer.instance


def __get_nested_path(
        name,
        arg=None,
        arg_regexp='[0-9]',
        empty_arg=True):
    path = name
    if not arg:
        return path
    path = ''.join([
        path, '/?(?P<', arg, '>', arg_regexp, '*' if empty_arg else "+", ')'
    ])
    return path


def _get_nested_subpath(*args, **kwargs):
    sub_path = kwargs.pop('sub_path', None)
    path = __get_nested_path(*args, **kwargs)
    if sub_path:
        path += '/'
        path += sub_path
    return path


def subaction(*args, **kwargs):
    """
    Decorator which wrap object method to subaction of viewset.

    :param methods: List of allowed HTTP-request methods. Default is ``["post"]``.
    :param detail: Flag to set method execution to one instance.
    :param serializer_class: Serializer for this action.
    :param permission_classes: Tuple or list permission classes.
    :param url_path: API-path name for this action.
    :param description: Description for this action in OpenAPI.
    :param multiaction: Allow to use this action in multiactions.
                        Works only with :class:`vstutils.api.serializers.EmptySerializer` as response.
    :param require_confirmation: Sets whether the action must be confirmed before being executed.
    :param is_list: Mark this action as paginated list with all rules and parameters.
    :param title: Override action title.
    :param icons: Setup action icon classes.
    """

    operation_description = kwargs.pop('description', None)
    response_code = kwargs.pop('response_code', None)
    serializer_class = kwargs.get('serializer_class', None)
    response_serializer = kwargs.pop('response_serializer', serializer_class)
    is_list = kwargs.pop('is_list', kwargs.get('suffix') == 'List')
    title = kwargs.pop('title', None)
    icons = kwargs.pop('icons', None)

    assert (
        (response_code is None) or
        (response_code is not None and response_serializer is not None)
    ), "If `response_code` was setted, `response_serializer` should be setted too."

    is_mul = kwargs.pop('multiaction', False)
    require_confirmation = kwargs.pop('require_confirmation', False)
    methods = kwargs['methods'] = kwargs.pop('methods', ['post'])

    def decorator(func: _t.Callable):
        func_object = action(*args, **kwargs)(func)
        override_kw: _t.Dict = {'methods': tuple(func_object.mapping.keys()) or None}  # type: ignore

        if response_code:
            override_kw['responses'] = {
                response_code: response_serializer()
            }

        if operation_description:
            override_kw['operation_description'] = operation_description
        else:
            override_kw['operation_description'] = str(func.__doc__ or '').strip()  # type: ignore

        override_kw['x-multiaction'] = bool(is_mul)

        override_kw['x-require-confirmation'] = bool(require_confirmation)
        override_kw['query_serializer'] = kwargs.get('query_serializer')

        if title:
            override_kw['x-title'] = title

        if icons and isinstance(icons, (tuple, list)):
            override_kw['x-icons'] = icons

        if 'GET' in methods or 'get' in methods:
            override_kw['x-list'] = is_list

        return swagger_auto_schema(**override_kw)(func_object)  # type: ignore

    return decorator


def get_action_name(master_view, method=''):
    method = method.lower()
    if method == 'post':
        action_name = 'create'
    elif method == 'get' and not master_view.nested_detail:
        action_name = 'list'
    elif method == 'get' and master_view.nested_detail:
        action_name = 'retrieve'
    elif method == 'put':
        action_name = 'update'
    elif method == 'patch':
        action_name = 'partial_update'
    elif method == 'delete':
        action_name = 'destroy'
    else:  # nocv
        action_name = None

    return action_name


class NestedViewMixin:
    def _check_permission_obj(self, objects):
        for obj in objects:
            self.check_object_permissions(self.request, obj)

    def get_queryset(self):
        qs = self.nested_manager.all()
        if any(
            DeepViewFilterBackend in getattr(self, attr, [])
            for attr in ['pre_filter_backends', 'filter_backends']
        ):
            qs = DeepViewFilterBackend().filter_queryset(self.request, qs, self)
        for qs_filter in self.queryset_filters:
            if callable(qs_filter):
                qs = qs_filter(self.nested_parent_object, qs)
        return qs

    def get_nested_action_name(self):
        return get_action_name(self.master_view, self.request.method)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        return context

    def perform_destroy(self, instance):
        purge_nested = self.master_view.request.headers.get('X-Purge-Nested', 'false') == 'true'

        if self.master_view.nested_allow_append:
            # pylint: disable=import-outside-toplevel
            from vstutils.models import notify_clients

            self.nested_manager.remove(instance)
            notify_clients(instance.__class__, {'pk': instance.pk})
            notify_clients(self.nested_parent_object.__class__, {'pk': self.nested_parent_object.pk})

        if not self.master_view.nested_allow_append or purge_nested:
            instance.delete()

    @transaction.atomic()
    def dispatch_route(self, nested_sub=None):
        kwargs = {}
        if nested_sub:
            self.action = nested_sub
        else:
            self.action = self.get_nested_action_name()
        if self.action != 'list':
            kwargs[self.nested_append_arg] = self.nested_id
        self.check_permissions(self.request)
        self.check_throttles(self.request)
        if getattr(self, 'is_main_action', False):
            getattr(self, 'check_etag', lambda r: None)(self.request)
        return self.finalize_response(
            self.request,
            getattr(self, self.action)(self.request, **kwargs),
            **kwargs
        )


class NestedWithoutAppendMixin(NestedViewMixin):

    def create(self, request, *_, **__):
        # pylint: disable=unused-argument
        many = isinstance(request.data, (list, tuple))
        return self.perform_create_nested(request.data, self.lookup_field, many)

    def prepare_request_data(self, request_data, many):
        return request_data if many else [request_data]

    def _data_create(self, request_data, nested_append_arg):
        get_serializer_func, manager = self.get_serializer, self.nested_manager
        return [
            getattr(_create_with_iteration(self, get_serializer_func, manager, d), nested_append_arg)
            for d in request_data
        ]

    def perform_create_nested(self, request_data, nested_append_arg, many):
        id_list = self._data_create(
            self.prepare_request_data(request_data, many), nested_append_arg
        )
        qs_filter = {nested_append_arg + '__in': id_list}
        queryset = self.get_queryset().filter(**qs_filter)

        if not many:
            queryset = queryset.get()

        serializer = self.get_serializer(queryset, many=many)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class NestedWithAppendMixin(NestedWithoutAppendMixin):

    def _data_create(self, request_data, nested_append_arg):
        # pylint: disable=import-outside-toplevel
        from vstutils.models import bulk_notify_clients

        filter_arg = f'{nested_append_arg}__in'
        request_data = [ensure_is_object(d) for d in request_data]
        objects = self.get_queryset().model.objects.filter(**{
            filter_arg: map(lambda i: i.get(nested_append_arg), request_data)
        })
        self._check_permission_obj(objects)
        self.nested_manager.add(*objects)
        id_list = [o.pk for o in objects]

        label = objects.model._meta.label

        handler = self.get_serializer_class()().get_fields()[nested_append_arg].to_representation

        def is_not_created(data):
            try:
                return handler(data.get(nested_append_arg, None)) not in id_list
            except:
                return True

        notif_objects = tuple(
            (label, {'pk': pk})
            for pk in id_list
        )
        id_list += super()._data_create(
            filter(is_not_created, request_data), nested_append_arg
        )

        bulk_notify_clients(objects=notif_objects)
        return id_list


def nested_view_function(master_view, view, view_request, *_, **kw):
    nested_sub = kw.get('nested_sub', None)
    view_obj = view(  # type: ignore
        request=view_request,
        kwargs=view_request.parser_context['kwargs'],
        headers=master_view.headers,
    )
    master_view.nested_view_object = view_obj
    master_view.nested_detail = view_obj.nested_detail
    return view_obj.dispatch_route(nested_sub)


class BaseClassDecorator:
    __slots__ = 'name', 'arg', 'request_arg', 'args', 'kwargs'

    def __init__(self, name, arg, *args, **kwargs):
        self.name = name
        self.arg = arg
        self.request_arg = kwargs.pop('request_arg', f'{self.name}_{self.arg}')
        self.args = args
        self.kwargs = kwargs

    def setup(self, view_class):  # nocv
        raise NotImplementedError()

    def __call__(self, view_class):
        return self.decorator(view_class)

    def decorator(self, view_class):
        return self.setup(view_class)


class nested_view(BaseClassDecorator):  # pylint: disable=invalid-name
    """
    By default, DRF does not support nested views.
    This decorator solves this problem.

    You need two or more models with nested relationship (Many-to-Many or Many-to-One)
    and two viewsets. Decorator nests viewset to parent viewset class and
    generate paths in API.

    :param name: Name of nested path. Also used as default name for related queryset (see `manager_name`).
    :type name: str
    :param arg: Name of nested primary key field.
    :type arg: str
    :param view: Nested viewset class.
    :type view:
        vstutils.api.base.ModelViewSet,
        vstutils.api.base.HistoryModelViewSet,
        vstutils.api.base.ReadOnlyModelViewSet
    :param allow_append: Flag for allowing to append existed instances.
    :type allow_append: bool
    :param manager_name: Name of model-object attr which contains nested queryset.
    :type manager_name: str,typing.Callable
    :param methods: List of allowed methods to nested view endpoints.
    :type methods: list
    :param subs: List of allowed subviews or actions to nested view endpoints.
    :type subs: list,None
    :param queryset_filters: List of callable objects which returns filtered queryset of main.


    .. note::
        Some view methods will not call for performance reasons.
        This also applies to some of the class attributes that are usually initialized in the methods.
        For example, ``.initial()`` will never call.
        Each viewset wrapped by nested class with additional logic.

    Example:

        .. sourcecode:: python

            from vstutils.api.decorators import nested_view
            from vstutils.api.base import ModelViewSet
            from . import serializers as sers


            class StageViewSet(ModelViewSet):
                model = sers.models.Stage
                serializer_class = sers.StageSerializer


            nested_view('stages', 'id', view=StageViewSet)
            class TaskViewSet(ModelViewSet):
                model = sers.models.Task
                serializer_class = sers.TaskSerializer


        This code generates api paths:

         * `/tasks/` - GET, POST
         * `/tasks/{id}/` - GET, PUT, PATCH, DELETE
         * `/tasks/{id}/stages/` - GET, POST
         * `/tasks/{id}/stages/{stages_id}/` - GET, PUT, PATCH, DELETE

    """
    __slots__ = (
        'view',
        'allowed_subs',
        '_subs',
        'methods',
        'queryset_filters',
        'empty_arg',
        'append_arg',
        'allow_append',
        'manager_name',
        'schema',
    )

    filter_subs = ('filter',)

    class NoView(VSTUtilsException):
        msg = 'Argument "view" must be installed for `nested_view` decorator.'

    def __init__(self, name, arg=None, methods=None, *args, **kwargs):
        if 'view' not in kwargs:
            raise self.NoView()
        self.view = kwargs.pop('view')
        self.allowed_subs = kwargs.pop('subs', ())
        self.queryset_filters = kwargs.pop('queryset_filters', [])
        self.empty_arg = kwargs.pop('empty_arg', False)
        self.allow_append = bool(kwargs.pop('allow_append', False))
        self.manager_name = kwargs.pop('manager_name', name)

        super().__init__(name, arg, *args, **kwargs)

        self._subs = self.get_subs()
        self.append_arg = self.kwargs.pop('append_arg', self.arg)
        self.methods = methods

        if self.arg is None:
            self.methods = methods or ['get']

    def _get_subs_from_view(self):
        # pylint: disable=protected-access
        actions = getmembers(self.view, _is_extra_action)
        if self.arg is None:
            actions = filter(lambda x: not x[1].detail, actions)
        extra_acts = map(lambda x: x[0], actions)
        filter_subs = self.filter_subs
        return filter(lambda name: name not in filter_subs, extra_acts)

    def get_subs(self):
        subs = set(self._get_subs_from_view())

        if self.allowed_subs is None:
            return set()
        elif self.allowed_subs:
            return set(self.allowed_subs).intersection(subs)

        return subs

    def get_view(self, name, **options):
        # pylint: disable=redefined-outer-name,too-many-statements
        mixin_class = NestedViewMixin

        if hasattr(self.view, 'create'):
            if self.allow_append:
                mixin_class = NestedWithAppendMixin
            else:
                mixin_class = NestedWithoutAppendMixin

        tp = name.split('_')[-1]
        if tp == 'detail':
            detail = True
        elif tp == 'list':
            detail = False
        else:
            detail = getattr(self.view, options['nested_sub']).detail

        manager_name = self.manager_name or self.name
        view_class = utils.get_if_lazy(self.view)

        class NestedView(mixin_class, view_class):
            __doc__ = self.view.__doc__
            format_kwarg = None
            queryset_filters = self.queryset_filters

        NestedView.__name__ = self.view.__name__  # type: ignore
        NestedView.nested_detail = detail  # type: ignore

        def nested_view_function_wrapper(view_obj, request, *args, **kwargs):
            kwargs.update(options)
            # Nested name
            view_obj.nested_name = name
            # Allow to append to nested or only create
            view_obj.nested_allow_append = self.allow_append
            # ID name of nested object
            nested_request_arg = view_obj.nested_arg = self.request_arg
            nested_append_arg = view_obj.nested_append_arg = self.append_arg
            view_obj.nested_id = kwargs.get(view_obj.nested_arg, None)
            nested_parent_object = view_obj.nested_parent_object = view_obj.get_object()

            if nested_append_arg:
                nested_id = getattr(nested_parent_object, nested_append_arg, None)
            else:
                nested_id = None

            if callable(manager_name):
                nested_manager = manager_name(nested_parent_object)
            else:
                if hasattr(nested_parent_object, manager_name):
                    nested_manager = getattr(nested_parent_object, manager_name)
                else:
                    view_manager_function_name = f'get_manager_{manager_name}'
                    nested_manager_func = getattr(view_obj, view_manager_function_name)
                    nested_manager = nested_manager_func(nested_parent_object)

            NestedView.__name__ = self.view.__name__
            NestedView.master_view = view_obj
            NestedView.lookup_field = nested_append_arg
            NestedView.lookup_url_kwarg = nested_request_arg
            NestedView.nested_detail = detail
            NestedView.nested_allow_append = self.allow_append
            NestedView.nested_append_arg = nested_append_arg
            NestedView.nested_request_arg = nested_request_arg
            NestedView.nested_parent_object = nested_parent_object
            NestedView.nested_id = nested_id
            NestedView.nested_manager = nested_manager

            getattr(view_obj, 'nested_allow_check', lambda *_, **__: None)()
            return nested_view_function(view_obj, NestedView, request, *args, **kwargs)

        nested_view_function_wrapper.__name__ = name
        nested_view_function_wrapper.__doc__ = self.view.__doc__
        nested_view_function_wrapper._nested_view = self.view
        nested_view_function_wrapper._nested_wrapped_view = NestedView
        return name, nested_view_function_wrapper

    def get_view_type(self, type_name, **options):
        return self.get_view(f'{self.name}_{type_name}', **options)

    def get_list_view(self, **options):
        return self.get_view_type('list', **options)

    def get_detail_view(self, **options):
        return self.get_view_type('detail', **options)

    def get_sub_view(self, sub, **options):
        return self.get_view_type(sub, nested_sub=sub, **options)

    def get_decorator(self, detail=False, **options):
        kwargs = dict(self.kwargs)
        kwargs.update(options)
        return action(
            detail=True,
            url_path=_get_nested_subpath(
                self.name,
                self.request_arg if detail else '',
                arg_regexp=kwargs.pop('arg_regexp', '[0-9]') if detail else None,
                empty_arg=self.empty_arg if detail else None,
                sub_path=kwargs.pop('sub_path', None)
            ),
            **kwargs
        )

    def _filter_methods(self, methods, detail=False):
        allowed_methods = set(self.view.get_view_methods(detail))
        return allowed_methods.intersection(methods)

    def decorated(self, detail):
        name, view = self.get_detail_view() if detail else self.get_list_view()
        kwargs = {'url_name': f'{self.name}-{"detail" if detail else "list"}', 'detail': detail}
        if not detail:
            kwargs['suffix'] = 'List'
        if self.methods:
            kwargs['methods'] = self._filter_methods(self.methods, detail=detail)
        else:
            kwargs['methods'] = self.view.get_view_methods(detail)  # type: ignore
        kwargs['schema'] = self.kwargs.get('schema', self.view.schema)
        view_class = self.get_decorator(**kwargs)(view)
        view_class._nested_args = getattr(self.view, '_nested_args', OrderedDict())
        view_class._nested_manager = self.kwargs.get('manager_name', self.name)
        view_class._nested_view = self.view
        view_class._nested_name = self.name
        view_class._nested_subname = self.name
        view_class._nested_wrapped_view = view._nested_wrapped_view
        if self.arg:
            view_class._nested_args[self.name] = self.arg
        return name, view_class

    def decorated_list(self):
        return self.decorated(detail=False)

    def decorated_detail(self):
        return self.decorated(detail=True)

    def _get_decorated_sub(self, sub):
        name, subaction_view = self.get_sub_view(sub)
        sub_view = getattr(self.view, sub)
        decorator = self.get_decorator(
            detail=sub_view.detail,
            sub_path=sub_view.url_path,
            methods=sub_view.mapping or self.methods,
            url_name=f'{self.name}-{sub_view.url_name}',
            schema=self.kwargs.get('schema', sub_view.kwargs.get('schema', self.view.schema)),
            _nested_args=getattr(sub_view, '_nested_args', OrderedDict())
        )
        view_class = decorator(subaction_view)
        existing_swagger_auto_schema = getattr(view_class, '_swagger_auto_schema', {})
        view_class._swagger_auto_schema = getattr(
            sub_view, '_swagger_auto_schema', existing_swagger_auto_schema
        )
        view_class._nested_view = getattr(sub_view, '_nested_view', self.view)
        view_class._nested_name = sub
        view_class._nested_subname = getattr(sub_view, '_nested_subname', self.name)
        view_class._nested_wrapped_view = getattr(sub_view, '_nested_wrapped_view', None)
        view_class._nested_args = getattr(sub_view, '_nested_args', OrderedDict())
        if self.arg:
            view_class._nested_args[self.name] = self.arg
        return name, view_class

    def generate_decorated_subs(self):
        for sub in self._subs:
            yield self._get_decorated_sub(sub)

    def setup(self, view_class):
        if self.arg:
            setattr(view_class, *self.decorated_detail())
            view_class._nested_args = getattr(view_class, '_nested_args', OrderedDict())
            view_class._nested_args[self.name] = self.request_arg
        if self._subs:
            for sub_action_name, sub_action_view in self.generate_decorated_subs():
                setattr(view_class, sub_action_name, sub_action_view)
        setattr(view_class, *self.decorated_list())
        return view_class


def extend_viewset_attribute(name, override=False, data=None):
    def wrapper(view_class):
        if not override:
            attr_data = tuple(list(getattr(view_class, name, ())) + list(data or ()))
        else:
            attr_data = data
        setattr(view_class, name, attr_data)
        return view_class

    return wrapper


def extend_filterbackends(backends, override=False):
    return extend_viewset_attribute('filter_backends', override, backends)


def cache_method_result(func):
    """
    Decorator that caches return value of method based on args and kwargs,
    cache value stored in the object instance
    """
    name = f'__cache_{func.__name__}'

    def wrapper(self, *args, **kwargs):
        result = getattr(self, name, None)

        if result is None or result[0] != args or result[1] != kwargs:
            result = (args, kwargs, func(self, *args, **kwargs))
            setattr(self, name, result)

        return result[2]

    return wrapper
