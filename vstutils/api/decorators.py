# pylint: disable=protected-access
from collections import OrderedDict
from inspect import getmembers
from django.db import transaction
from rest_framework.decorators import action
from rest_framework import viewsets as vsets, response, status
from ..exceptions import VSTUtilsException


def __get_nested_path(name, arg=None, arg_regexp='[0-9]', empty_arg=True):
    path = name
    if not arg:
        return path
    path = ''.join([
        path, '/?(?P<', arg, '>', arg_regexp, '*' if empty_arg else "+", ')'
    ])
    return path

def __get_nested_subpath(*args, **kwargs):
    sub_path = kwargs.pop('sub_path', None)
    path = __get_nested_path(*args, **kwargs)
    if sub_path:
        path += '/'
        path += sub_path
    return path


def nested_action(name, arg=None, methods=None, manager_name=None, *args, **kwargs):
    # pylint: disable=too-many-locals
    list_methods = ['get', 'head', 'options', 'post']
    detail_methods = ['get', 'head', 'options', 'put', 'patch', 'delete']
    methods = methods or (detail_methods if arg else list_methods)
    arg_regexp = kwargs.pop('arg_regexp', '[0-9]')
    empty_arg = kwargs.pop('empty_arg', True)
    request_arg = kwargs.pop('request_arg', '{}_{}'.format(name, arg))
    request_arg = request_arg if arg else None
    append_arg = kwargs.pop('append_arg', arg)
    sub_options = kwargs.pop('sub_opts', dict())
    path = __get_nested_subpath(name, request_arg, arg_regexp, empty_arg, **sub_options)
    allow_append = bool(kwargs.pop('allow_append', False))
    manager_name = manager_name or name
    _nested_args = kwargs.pop('_nested_args', OrderedDict())
    _nested_filter_class = kwargs.pop('filter_class', None)

    def decorator(func):
        def wrapper(view, request, *args, **kwargs):
            # Nested name
            view.nested_name = name
            # Allow append to nested or only create
            view.nested_allow_append = allow_append
            # ID name of nested object
            view.nested_arg = request_arg
            view.nested_append_arg = append_arg
            view.nested_id = kwargs.get(view.nested_arg, None)
            view.nested_view_object = None
            view._nested_filter_class = _nested_filter_class
            return func(view, request, *args)

        wrapper.__name__ = func.__name__
        kwargs['methods'] = methods
        kwargs['detail'] = True
        kwargs['url_path'] = path
        kwargs['url_name'] = kwargs.pop('url_name', name)
        view = action(*args, **kwargs)(wrapper)
        view._nested_args = _nested_args
        view._nested_manager = manager_name or name
        view._nested_filter_class = _nested_filter_class
        if arg:
            view._nested_args[name] = request_arg
        return view

    return decorator


def get_action_name(master_view, method):
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


class NestedViewMixin(object):

    def _check_permission_obj(self, objects):
        for obj in objects:
            self.check_object_permissions(self.request, obj)

    def get_queryset(self):
        return self.nested_manager.all()

    def get_nested_action_name(self):
        return get_action_name(self.master_view, self.request.method)

    def get_serializer_context(self):
        context = super(NestedViewMixin, self).get_serializer_context()
        return context

    def perform_destroy(self, instance):
        if self.master_view.nested_allow_append:
            self.nested_manager.remove(instance)
        else:
            instance.delete()

    @transaction.atomic()
    def dispatch_route(self, nested_sub=None):
        kwargs = dict()
        if nested_sub:
            self.action = nested_sub
        else:
            self.action = self.get_nested_action_name()
        if self.action != 'list':
            kwargs.update({
                self.nested_append_arg: self.nested_id
            })
        return getattr(self, self.action)(self.request, **kwargs)


class NestedWithoutAppendMixin(NestedViewMixin):

    def create(self, request, *args, **kwargs):
        # pylint: disable=unused-argument
        many = isinstance(request.data, (list, tuple))
        return self.perform_create_nested(request.data, self.lookup_field, many)

    def prepare_request_data(self, request_data, many):
        return request_data if many else [request_data]

    def _data_create(self, request_data, nested_append_arg):
        id_list = []
        for data in request_data:
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            obj = self.nested_manager.create(**serializer.validated_data)
            id_list.append(getattr(obj, nested_append_arg))

        return id_list

    def perform_create_nested(self, request_data, nested_append_arg, many):
        id_list = self._data_create(
            self.prepare_request_data(request_data, many), nested_append_arg
        )
        qs_filter = {nested_append_arg+'__in': id_list}
        queryset = self.get_queryset().filter(**qs_filter)
        if not many:
            queryset = queryset.get()

        serializer = self.get_serializer(queryset, many=many)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class NestedWithAppendMixin(NestedWithoutAppendMixin):
    def _data_create(self, request_data, nested_append_arg):
        filter_arg = '{}__in'.format(nested_append_arg)
        objects = self.get_queryset().model.objects.filter(**{
            filter_arg: map(lambda i: i.get(nested_append_arg), request_data)
        })
        self._check_permission_obj(objects)
        self.nested_manager.add(*objects)
        id_list = list(objects.values_list(nested_append_arg, flat=True))
        not_created = filter(
            lambda data: data.get(nested_append_arg, None) not in id_list, request_data
        )
        id_list += super(NestedWithAppendMixin, self)._data_create(
            not_created, nested_append_arg
        )
        return id_list


def nested_view_function(master_view, view, view_request, *args, **kw):
    # pylint: disable=unused-argument,unnecessary-lambda
    nested_sub = kw.get('nested_sub', None)
    view_obj = view()
    view_obj.request = view_request
    view_obj.kwargs = view_request.parser_context['kwargs']
    master_view.nested_view_object = view_obj
    master_view.nested_detail = view.nested_detail
    return view_obj.dispatch_route(nested_sub)


class BaseClassDecorator(object):
    def __init__(self, name, arg, *args, **kwargs):
        self.name = name
        self.arg = arg
        self.request_arg = kwargs.pop('request_arg', '{}_{}'.format(self.name, self.arg))
        self.args = args
        self.kwargs = kwargs

    def setup(self, view_class):  # nocv
        raise NotImplementedError()

    def __call__(self, view_class):
        return self.decorator(view_class)

    def decorator(self, view_class):
        return self.setup(view_class)


class nested_view(BaseClassDecorator):  # pylint: disable=invalid-name
    filter_subs = ['filter',]
    class NoView(VSTUtilsException):
        msg = 'Argument "view" must be installed for `nested_view` decorator.'

    def __init__(self, name, arg=None, methods=None, *args, **kwargs):
        self.view = kwargs.pop('view', None)
        self.allowed_subs = kwargs.pop('subs', [])
        super(nested_view, self).__init__(name, arg, *args, **kwargs)
        self._subs = self.get_subs()
        if self.view is None:
            raise self.NoView()
        self.serializers = self.__get_serializers(kwargs)
        self.methods = methods
        if self.arg is None:
            self.methods = methods or ['get']
        self.kwargs['empty_arg'] = self.kwargs.pop('empty_arg', False)
        self.kwargs['append_arg'] = self.arg
        self.kwargs['request_arg'] = self.request_arg

    def __get_serializers(self, kwargs):
        serializer_class = kwargs.pop('serializer_class', self.view.serializer_class)
        serializer_class_one = kwargs.pop(
            'serializer_class_one', getattr(self.view, 'serializer_class_one', None)
        ) or serializer_class
        return (serializer_class, serializer_class_one)

    def _get_subs_from_view(self):
        # pylint: disable=protected-access
        extra_acts = map(lambda x: x[0], getmembers(self.view, vsets._is_extra_action))
        filter_subs = self.filter_subs
        return list(filter(lambda name: name not in filter_subs, extra_acts))

    def get_subs(self):
        subs = self._get_subs_from_view()
        if self.allowed_subs is None:
            return []
        elif self.allowed_subs:
            allowed_subs = set(self.allowed_subs)
            subs = allowed_subs.intersection(subs)
        return subs

    @property
    def serializer(self):
        return self.serializers[0]

    @property
    def serializer_one(self):
        return self.serializers[-1]

    def get_view(self, name, **options):
        # pylint: disable=redefined-outer-name
        mixin_class = NestedViewMixin
        if getattr(self.view, 'create', None) is not None:
            if self.kwargs.get('allow_append', False):
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

        manager_name = self.kwargs.get('manager_name', self.name)

        def nested_view(view_obj, request, *args, **kwargs):
            kwargs.update(options)
            view_obj.nested_parent_object = view_obj.get_object()
            nested_allow_append = view_obj.nested_allow_append
            nested_append_arg = view_obj.nested_append_arg
            nested_request_arg = view_obj.nested_arg
            nested_parent_object = view_obj.nested_parent_object
            if nested_append_arg:
                nested_id = getattr(nested_parent_object, nested_append_arg, None)
            else:
                nested_id = None
            nested_manager = getattr(nested_parent_object, manager_name)

            class NestedView(mixin_class, self.view):
                __doc__ = self.view.__doc__
                master_view = view_obj
                lookup_field = nested_append_arg
                lookup_url_kwarg = nested_request_arg
                format_kwarg = None

            NestedView.__name__ = self.view.__name__
            NestedView.nested_detail = detail
            NestedView.nested_allow_append = nested_allow_append
            NestedView.nested_append_arg = nested_append_arg
            NestedView.nested_request_arg = nested_request_arg
            NestedView.nested_parent_object = nested_parent_object
            NestedView.nested_id = nested_id
            NestedView.nested_manager = nested_manager

            getattr(view_obj, 'nested_allow_check', lambda *args, **kwargs: None)()
            return nested_view_function(view_obj, NestedView, request, *args, **kwargs)

        nested_view.__name__ = name
        nested_view.__doc__ = self.view.__doc__
        nested_view._nested_view = self.view
        return name, nested_view

    def get_view_type(self, type_name, **options):
        return self.get_view('{}_{}'.format(self.name, type_name), **options)

    def get_list_view(self, **options):
        return self.get_view_type('list', **options)

    def get_detail_view(self, **options):
        return self.get_view_type('detail', **options)

    def get_sub_view(self, sub, **options):
        return self.get_view_type(sub, nested_sub=sub, **options)

    def get_decorator(self, detail=False, **options):
        args = [self.name]
        args += [self.arg] if detail else []
        args += self.args
        kwargs = dict(self.kwargs)
        kwargs['methods'] = self.methods
        kwargs['serializer_class'] = self.serializer_one if detail else self.serializer
        kwargs['filter_class'] = getattr(self.view, 'filter_class', [])
        kwargs.update(options)
        return nested_action(*args, **kwargs)

    def _filter_methods(self, methods, detail=False):
        allowed_methods = set(self.view.get_view_methods(detail))
        return allowed_methods.intersection(methods)

    def decorated(self, detail):
        name, view = self.get_detail_view() if detail else self.get_list_view()
        kwargs = dict(detail=detail)
        kwargs['url_name'] = '{}-{}'.format(self.name, 'detail' if detail else 'list')
        if not detail:
            kwargs['suffix'] = 'List'
        if self.methods:
            kwargs['methods'] = self._filter_methods(self.methods, detail=detail)
        else:
            kwargs['methods'] = self.view.get_view_methods(detail)
        view = self.get_decorator(**kwargs)(view)
        view._nested_view = self.view
        return name, view

    def decorated_list(self):
        return self.decorated(detail=False)

    def decorated_detail(self):
        return self.decorated(detail=True)

    def _get_decorated_sub(self, sub):
        name, subaction_view = self.get_sub_view(sub)
        sub_view = getattr(self.view, sub)
        sub_path = sub_view.url_path
        decorator = self.get_decorator(
            detail=sub_view.detail,
            sub_opts=dict(sub_path=sub_path),
            methods=sub_view.bind_to_methods or self.methods,
            serializer_class=sub_view.kwargs.get('serializer_class', self.serializer),
            url_name='{}-{}'.format(self.name, sub_view.url_name),
            _nested_args=getattr(sub_view, '_nested_args', OrderedDict())
        )
        view = decorator(subaction_view)
        existing_swagger_auto_schema = getattr(view, '_swagger_auto_schema', {})
        view._swagger_auto_schema = getattr(
            sub_view, '_swagger_auto_schema', existing_swagger_auto_schema
        )
        return name, view

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
