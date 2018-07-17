# pylint: disable=too-many-locals
import sys
import logging
import traceback
from collections import namedtuple
from inspect import getmembers

import six
from django.conf import settings
from django.core import exceptions as djexcs
from django.http.response import Http404
from django.db.models.query import QuerySet
from django.db import transaction
from rest_framework.reverse import reverse
from rest_framework import viewsets as vsets, views as rvs, exceptions, status
from rest_framework.response import Response as RestResponse
from rest_framework.decorators import action
from ..exceptions import VSTUtilsException
from ..utils import classproperty

_ResponseClass = namedtuple("ResponseData", [
    "data", "status"
])
default_methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']
logger = logging.getLogger(settings.VST_PROJECT)


def exception_handler(exc, context):
    logger.info(traceback.format_exc())
    default_exc = (exceptions.APIException, djexcs.PermissionDenied)
    if isinstance(exc, djexcs.PermissionDenied):  # pragma: no cover
        return RestResponse({"detail": str(exc)},
                            status=status.HTTP_403_FORBIDDEN)
    elif isinstance(exc, Http404):
        return RestResponse({"detail": getattr(exc, 'msg', str(exc))},
                            status=status.HTTP_404_NOT_FOUND)
    elif isinstance(exc, djexcs.ValidationError):  # nocv
        if hasattr(exc, 'error_dict'):
            errors = dict(exc)
        elif hasattr(exc, 'error_list'):
            errors = {'other_errors': list(exc)}
        else:
            errors = {'other_errors': str(exc)}
        return RestResponse({"detail": errors}, status=status.HTTP_400_BAD_REQUEST)
    elif isinstance(exc, VSTUtilsException):  # nocv
        return RestResponse(
            {"detail": exc.msg, 'error_type': sys.exc_info()[0].__name__},
            status=exc.status
        )
    elif not isinstance(exc, default_exc) and isinstance(exc, Exception):
        return RestResponse({'detail': str(sys.exc_info()[1]),
                             'error_type': sys.exc_info()[0].__name__},
                            status=status.HTTP_400_BAD_REQUEST)

    default_response = rvs.exception_handler(exc, context)

    if isinstance(exc, exceptions.NotAuthenticated):  # nocv
        default_response["X-Anonymous"] = "true"

    return default_response


class Response(_ResponseClass):

    def _asdict(self):
        data = super(Response, self)._asdict()
        data["status"] = data.get("status", status.HTTP_200_OK)
        if isinstance(data["data"], (six.string_types, six.text_type)):
            data["data"] = dict(detail=self.data)
        return data

    @property
    def resp(self):
        return RestResponse(**self._asdict())

    @property
    def resp_dict(self):  # nocv
        return self._asdict()


def __get_nested_path(name, arg=None, arg_regexp='[0-9]', empty_arg=True):
    path = name
    if not arg:
        return path
    path += '/?(?P<'
    path += arg
    path += '>'
    path += arg_regexp
    path += '*' if empty_arg else "+"
    path += ')'
    return path

def __get_nested_subpath(*args, **kwargs):
    sub_path = kwargs.pop('sub_path', None)
    path = __get_nested_path(*args, **kwargs)
    if sub_path:
        path += '/'
        path += sub_path
    return path


def nested_action(name, arg=None, methods=None, manager_name=None, *args, **kwargs):
    list_methods = ['get', 'head', 'options', 'post']
    detail_methods = ['get', 'head', 'options', 'put', 'patch', 'delete']
    methods = methods or (detail_methods if arg else list_methods)
    arg_regexp = kwargs.pop('arg_regexp', '[0-9]')
    empty_arg = kwargs.pop('empty_arg', True)
    request_arg = '{}_{}'.format(name, arg) if arg else None
    append_arg = kwargs.pop('append_arg', arg)
    sub_options = kwargs.pop('sub_opts', dict())
    path = __get_nested_subpath(name, request_arg, arg_regexp, empty_arg, **sub_options)
    allow_append = bool(kwargs.pop('allow_append', False))
    manager_name = manager_name or name

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
            return func(view, request, *args)

        wrapper.__name__ = func.__name__
        kwargs['methods'] = methods
        kwargs['detail'] = True
        kwargs['url_path'] = path
        kwargs['url_name'] = kwargs.pop('url_name', name)
        return action(*args, **kwargs)(wrapper)

    return decorator


class nested_view(object):  # pylint: disable=invalid-name
    filter_subs = ['filter',]
    class NoView(VSTUtilsException):
        msg = 'Argument "view" must be installed for `nested_view` decorator.'

    def __init__(self, name, arg=None, methods=None, *args, **kwargs):
        self.name = name
        self.arg = arg
        self.view = kwargs.pop('view', None)
        self.allowed_subs = kwargs.pop('subs', [])
        self._subs = self.get_subs()
        if self.view is None:
            raise self.NoView()
        self.serializers = self.__get_serializers(kwargs)
        self.methods = methods
        if self.arg is None:
            self.methods = methods or ['get']
        self.args = args
        self.kwargs = kwargs
        self.kwargs['empty_arg'] = self.kwargs.pop('empty_arg', False)
        self.kwargs['append_arg'] = self.arg

    def __get_serializers(self, kwargs):
        serializer_class = kwargs.pop('serializer_class', self.view.serializer_class)
        serializer_class_one = kwargs.pop(
            'serializer_class_one', getattr(self.view, 'serializer_class_one', None)
        ) or serializer_class
        return (serializer_class, serializer_class_one)

    def _get_subs_from_view(self):
        # pylint: disable=protected-access
        return [
            name for name, _ in getmembers(self.view, vsets._is_extra_action)
            if name not in self.filter_subs
        ]

    def get_subs(self):
        subs = self._get_subs_from_view()
        if self.allowed_subs is None:
            return []
        elif self.allowed_subs:
            subs = [sub for sub in subs if sub in self.allowed_subs]
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
        return name, nested_view

    def get_list_view(self, **options):
        return self.get_view('{}_list'.format(self.name), **options)

    def get_detail_view(self, **options):
        return self.get_view('{}_detail'.format(self.name), **options)

    def get_sub_view(self, sub, **options):
        return self.get_view('{}_{}'.format(self.name, sub), nested_sub=sub, **options)

    def get_decorator(self, detail=False, **options):
        args = [self.name]
        args += [self.arg] if detail else []
        args += self.args
        kwargs = dict(self.kwargs)
        kwargs['methods'] = self.methods
        kwargs['serializer_class'] = self.serializer_one if detail else self.serializer
        kwargs.update(options)
        return nested_action(*args, **kwargs)

    def decorated_list(self):
        name, view = self.get_list_view()
        return name, self.get_decorator(url_name='{}-list'.format(self.name))(view)

    def decorated_detail(self):
        name, view = self.get_detail_view()
        return name, self.get_decorator(
            True, url_name='{}-detail'.format(self.name)
        )(view)

    def _get_decorated_sub(self, sub):
        name, subaction_view = self.get_sub_view(sub)
        sub_view = getattr(self.view, sub)
        sub_path = sub_view.url_path
        decorator = self.get_decorator(
            detail=sub_view.detail,
            sub_opts=dict(sub_path=sub_path),
            methods=sub_view.bind_to_methods or self.methods,
            serializer_class=sub_view.kwargs.get('serializer_class', self.serializer),
            url_name='{}-{}'.format(self.name, sub_view.url_name)
        )
        return name, decorator(subaction_view)

    def generate_decorated_subs(self):
        for sub in self._subs:
            yield self._get_decorated_sub(sub)

    def setup(self, view_class):
        if self.arg:
            setattr(view_class, *self.decorated_detail())
        if self._subs:
            for sub_action_name, sub_action_view in self.generate_decorated_subs():
                setattr(view_class, sub_action_name, sub_action_view)
        setattr(view_class, *self.decorated_list())

    def __call__(self, view_class):
        return self.decorator(view_class)

    def decorator(self, view_class):
        self.setup(view_class)
        return view_class


class QuerySetMixin(rvs.APIView):
    _queryset = None
    model = None

    @classproperty
    def queryset(self):
        # pylint: disable=method-hidden
        if self._queryset is not None:
            return getattr(self._queryset, 'cleared', self._queryset.all)()
        qs = self.model.objects.all()
        return getattr(qs, 'cleared', qs.all)()

    @queryset.setter
    def queryset(self, value):
        self._queryset = value

    def _base_get_queryset(self):
        assert self.queryset is not None, (
            "'%s' should either include a `queryset` attribute, "
            "or override the `get_queryset()` method."
            % self.__class__.__name__
        )

        queryset = self.queryset
        if isinstance(queryset, QuerySet):
            # Ensure queryset is re-evaluated on each request.
            queryset = queryset.all()
        return queryset

    def get_extra_queryset(self):
        return self.queryset

    def get_queryset(self):
        if self.queryset is None:  # nocv
            assert self.model is not None, (
                "'%s' should either include a `queryset` or `model` attribute,"
                " or override the `get_queryset()` method."
                % self.__class__.__name__
            )
            qs = self.model.objects.all()
            self.queryset = getattr(qs, 'cleared', qs.all)()
        self.queryset = self.get_extra_queryset()
        return self._base_get_queryset()


class GenericViewSet(QuerySetMixin, vsets.GenericViewSet):
    # lookup_field = 'id'
    serializer_class_one = None
    model = None

    def get_serializer_class(self):
        lookup_field = self.lookup_url_kwarg or self.lookup_field or 'pk'
        detail_actions = ['create', 'retrieve', 'update', 'partial_update']
        lookup_field_data = self.kwargs.get(lookup_field, False)
        if self.request and (lookup_field_data or self.action in detail_actions):
            if self.serializer_class_one is not None:
                return self.serializer_class_one
        return super(GenericViewSet, self).get_serializer_class()

    def get_route_object(self, queryset, id):
        find_kwargs = {getattr(self, 'nested_append_arg', 'id'): id}
        try:
            obj = queryset.all().get(**find_kwargs)
            if self.nested_view_object is not None:
                self.nested_view_object.action = 'create'
                self.nested_view_object.check_object_permissions(self.request, obj)
            return obj
        except exceptions.PermissionDenied:  # nocv
            raise
        except djexcs.ObjectDoesNotExist:
            raise exceptions.NotFound()

    def filter_route_queryset(self, queryset, filter_classes=None):
        if filter_classes is not None:
            if not isinstance(filter_classes, (list, tuple)):
                filter_classes = [filter_classes]
            for filter_class in list(filter_classes):
                queryset = filter_class(
                    self.request.query_params, queryset=queryset, request=self.request
                ).qs
        return queryset

    def get_route_serializer(self, serializer_class, *args, **kwargs):
        kwargs['context'] = kwargs.get('context', self.get_serializer_context())
        return serializer_class(*args, **kwargs)

    def get_paginated_route_response(self, queryset, serializer_class,
                                     filter_classes=None, **kwargs):
        queryset = self.filter_route_queryset(queryset.all(), filter_classes)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_route_serializer(
                serializer_class, page, many=True, **kwargs
            )
            return self.get_paginated_response(serializer.data)

        serializer = self.get_route_serializer(queryset, many=True, **kwargs)  # nocv
        return RestResponse(serializer.data)  # nocv

    def get_route_instance(self, instance, serializer_class):
        serializer = self.get_route_serializer(serializer_class, instance)
        return Response(serializer.data, status.HTTP_200_OK).resp

    def _add_or_create_nested(self, queryset, data, serializer_class, **kwargs):
        serializer = self.get_route_serializer(serializer_class, data=data, **kwargs)
        if not self.nested_allow_append:
            serializer.is_valid(raise_exception=True)
            obj = queryset.create(**serializer.validated_data)
            return self.get_route_serializer(serializer_class, obj, **kwargs)
        try:
            obj = queryset.model.objects.get(
                **{self.nested_append_arg: data.get(self.nested_append_arg, None)}
            )
            if self.nested_view_object is not None:
                self.nested_view_object.action = 'create'
                self.nested_view_object.check_object_permissions(self.request, obj)
        except exceptions.PermissionDenied:  # nocv
            raise
        except djexcs.ObjectDoesNotExist:
            serializer.is_valid(raise_exception=True)
            obj = queryset.create(**serializer.validated_data)
        queryset.add(obj)
        return self.get_route_serializer(serializer_class, obj, **kwargs)

    def create_route_instance(self, queryset, request, serializer_class):
        serializer = self._add_or_create_nested(queryset, request.data, serializer_class)
        return Response(serializer.data, status.HTTP_201_CREATED).resp

    def update_route_instance(self, instance, request, serializer_class, partial=None):
        # pylint: disable=protected-access
        serializer = self.get_route_serializer(
            serializer_class, instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}  # nocv

        return Response(serializer.data, status.HTTP_200_OK).resp

    def delete_route_instance(self, manager, instance):
        if self.nested_allow_append:
            manager.remove(instance)
        else:
            instance.delete()
        return RestResponse(status=status.HTTP_204_NO_CONTENT)

    def nested_allow_check(self):
        '''
        Just raise or pass
        :return:
        '''
        pass

    @transaction.atomic()
    def dispatch_route_instance(self, serializer_class, filter_classes, request, **kw):
        self.nested_allow_check()
        obj_id = kw.get(getattr(self, 'nested_arg', 'id'), None)
        obj_id = obj_id or getattr(self, 'nested_id', None)
        manager = kw.get('manager', None) or getattr(self, 'nested_manager', None)
        method = request.method.lower()
        if isinstance(serializer_class, (list, tuple)):
            serializer_class_list = serializer_class[0]
            serializer_class_one = serializer_class[-1] or serializer_class_list
        else:  # nocv
            serializer_class_list = serializer_class
            serializer_class_one = serializer_class
        permission_access = str()
        if self.nested_view_object is not None:
            permission_access = self.nested_view_object.check_permissions
        permission_access(self.request)

        if method == 'post':
            return self.create_route_instance(manager, request, serializer_class_one)
        elif method == 'get' and not obj_id:
            return self.get_paginated_route_response(
                manager, serializer_class_list, filter_classes
            )
        elif method == 'get' and obj_id:
            return self.get_route_instance(
                self.get_route_object(manager, obj_id), serializer_class_one
            )
        elif method == 'put' and obj_id:
            return self.update_route_instance(
                self.get_route_object(manager, obj_id), request, serializer_class_one
            )
        elif method == 'patch' and obj_id:
            return self.update_route_instance(
                self.get_route_object(manager, obj_id), request, serializer_class_one, 1
            )
        elif method == 'delete' and obj_id:
            return self.delete_route_instance(
                manager, self.get_route_object(manager, obj_id)
            )

        raise exceptions.NotFound()  # nocv

    def _get_nested_queryset(self, vself):
        # pylint: disable=unused-argument
        return self.nested_manager.all()

    def dispatch_nested_view(self, view, view_request, *args, **kw):
        # pylint: disable=unused-argument,unnecessary-lambda
        nested_sub = kw.get('nested_sub', None)
        kwargs = {self.nested_append_arg: self.nested_id}
        view.get_queryset = lambda vself: self._get_nested_queryset(vself)
        view.lookup_field = self.nested_append_arg
        view.format_kwarg = None
        view_obj = view()
        view_obj.request = view_request
        view_obj.kwargs = kwargs
        self.nested_view_object = view_obj
        if nested_sub:
            view_obj.action = nested_sub
            return getattr(view_obj, nested_sub)(view_request)
        serializer_class = view.serializer_class
        serializer_class_one = getattr(view, 'serializer_class_one', serializer_class)
        filter_class = getattr(view, 'filter_class', None)
        return self.dispatch_route_instance(
            (serializer_class, serializer_class_one), filter_class, view_request, **kw
        )

    @classmethod
    def get_extra_actions(cls):
        return super(GenericViewSet, cls).get_extra_actions()

    @classmethod
    def as_view(cls, actions=None, **initkwargs):
        return super(GenericViewSet, cls).as_view(actions, **initkwargs)


class ModelViewSetSet(GenericViewSet, vsets.ModelViewSet):
    '''
    API endpoint thats operates models objects.
    '''

    # lookup_field = 'id'

    def create(self, request, *args, **kwargs):
        '''
        API endpoint to create instance.
        '''

        return super(ModelViewSetSet, self).create(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        '''
        API endpoint to represent instance detailed data.
        '''

        return super(ModelViewSetSet, self).retrieve(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):  # nocv
        '''
        API endpoint to update all instance fields.
        '''

        return super(ModelViewSetSet, self).update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):  # nocv
        '''
        API endpoint to update part of all instance fields.
        '''

        return super(ModelViewSetSet, self).partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        '''
        API endpoint to instance.
        '''

        return super(ModelViewSetSet, self).destroy(request, *args, **kwargs)


class NonModelsViewSet(GenericViewSet):
    base_name = None

    def get_queryset(self):
        return QuerySet()  # nocv


class ListNonModelViewSet(NonModelsViewSet, vsets.mixins.ListModelMixin):
    '''
    API endpoint that returns list of submethods.

    list:
    Returns json with view submethods name and link.
    '''
    # pylint: disable=abstract-method
    schema = None

    @property
    def methods(self):
        this_class_dict = ListNonModelViewSet.__dict__
        obj_class_dict = self.__class__.__dict__
        new_methods = list()
        for name, attr in obj_class_dict.items():
            detail = getattr(attr, 'detail', True)
            if name not in this_class_dict and not detail:
                new_methods.append(name.replace('_', "-"))
        return new_methods

    def list(self, request, *args, **kwargs):
        routes = {
            method: reverse("{}-{}".format(self.base_name, method),
                            request=request)
            for method in self.methods
        }
        return Response(routes, status.HTTP_200_OK).resp


class ReadOnlyModelViewSet(GenericViewSet, vsets.ReadOnlyModelViewSet):
    '''
    API endpoint with list of model objects for read only operations.

    list:
    Return list of all objects.
    '''


class HistoryModelViewSet(ReadOnlyModelViewSet, vsets.mixins.DestroyModelMixin):
    '''
    API endpoint with list of historical model objects for read and remove operations.

    destroy:
    Remove object from DB.

    list:
    Return list of all objects.
    '''
