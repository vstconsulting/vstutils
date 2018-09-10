# pylint: disable=protected-access
from collections import OrderedDict
from inspect import getmembers
from rest_framework.decorators import action
from rest_framework import viewsets as vsets
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
            # Nested parent object
            view.nested_parent_object = view.get_object()
            # Allow append to nested or only create
            view.nested_allow_append = allow_append
            # ID name of nested object
            view.nested_arg = request_arg
            view.nested_append_arg = append_arg
            view.nested_id = kwargs.get(view.nested_arg, None)
            view.nested_manager = getattr(
                view.nested_parent_object, manager_name or name, None
            )
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
        def nested_view(view_obj, request, *args, **kwargs):
            kwargs.update(options)

            class NestedView(self.view):
                __doc__ = self.view.__doc__

            NestedView.__name__ = self.view.__name__
            return view_obj.dispatch_nested_view(NestedView, request, *args, **kwargs)

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
