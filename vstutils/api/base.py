import sys
import logging
import traceback
from collections import namedtuple
from copy import deepcopy
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
from rest_framework.schemas import AutoSchema as DRFAutoSchema
from ..exceptions import VSTUtilsException
from ..utils import classproperty
from .serializers import (
    ErrorSerializer, ValidationErrorSerializer, OtherErrorsSerializer
)

_ResponseClass = namedtuple("ResponseData", [
    "data", "status"
])
default_methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']
logger = logging.getLogger(settings.VST_PROJECT)


def exception_handler(exc, context):
    traceback_str = traceback.format_exc()
    default_exc = (exceptions.APIException, djexcs.PermissionDenied)
    serializer_class = ErrorSerializer
    data = None
    code = status.HTTP_400_BAD_REQUEST
    if isinstance(exc, djexcs.PermissionDenied):  # pragma: no cover
        data = {"detail": str(exc)}
        code = status.HTTP_403_FORBIDDEN
        logger.debug(traceback_str)
    elif isinstance(exc, Http404):
        data = {"detail": getattr(exc, 'msg', str(exc))}
        code = status.HTTP_404_NOT_FOUND
        logger.debug(traceback_str)
    elif isinstance(exc, djexcs.ValidationError):  # nocv
        if hasattr(exc, 'error_dict'):
            errors = dict(exc)
        elif hasattr(exc, 'error_list'):
            errors = {'other_errors': list(exc)}
        else:
            errors = {'other_errors': str(exc)}
        data = {"detail": errors}
        serializer_class = ValidationErrorSerializer
        logger.debug(traceback_str)
    elif isinstance(exc, VSTUtilsException):  # nocv
        data = {"detail": exc.msg, 'error_type': sys.exc_info()[0].__name__}
        code = exc.status
        serializer_class = OtherErrorsSerializer
        logger.info(traceback_str)
    elif not isinstance(exc, default_exc) and isinstance(exc, Exception):
        data = {
            'detail': str(sys.exc_info()[1]), 'error_type': sys.exc_info()[0].__name__
        }
        serializer_class = OtherErrorsSerializer
        logger.debug(traceback_str)

    if data is not None:
        serializer = serializer_class(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except:  # nocv
            pass
        else:
            return RestResponse(serializer.data, code)

    logger.info(traceback_str)
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


class AutoSchema(DRFAutoSchema):

    def get_description(self, path, method):
        # pylint: disable=simplifiable-if-statement,redefined-outer-name
        method_name = getattr(self.view, 'action', method.lower())
        method_obj = getattr(self.view, method_name, None)
        method_view = getattr(method_obj, '_nested_view', None) if method_obj else None

        if method_obj.__doc__:
            return method_obj.__doc__.strip()
        if not method_view:
            return super(AutoSchema, self).get_description(path, method)

        method_view_obj = method_view()
        action = path.split('/')[-2]
        submethod = getattr(method_view, action, None)
        if submethod.__doc__:
            return submethod.__doc__.strip()  # nocv
        if method == 'GET' and '{' not in path[:-1].split('/')[-1]:
            action = 'list'
        elif method == 'POST':
            action = 'create'
        elif method == 'GET':
            action = 'retrieve'
        elif method == 'PUT':
            action = 'update'
        elif method == 'PATCH':
            action = 'partial_update'
        elif method == 'DELETE':
            action = 'destroy'
        method_view_obj.action = action
        return method_view_obj.schema.get_description(path, method)


class QuerySetMixin(rvs.APIView):
    '''
    Instance REST operations.
    '''
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
    _serializer_class_one = None
    model = None

    @classproperty
    def serializer_class_one(self):
        return self._serializer_class_one or self.serializer_class

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

    def _check_permission_obj(self, objects):
        if self.nested_view_object is not None:
            self.nested_view_object.action = 'create'
            for obj in objects:
                self.nested_view_object.check_object_permissions(self.request, obj)

    def _validate_nested(self, serializer_class, data, **kwargs):
        serializer = self.get_route_serializer(serializer_class, data=data, **kwargs)
        serializer.is_valid(raise_exception=True)
        return serializer

    def _add_or_create_nested_one(self, queryset, data, serializer_class, **kwargs):
        filter_arg = kwargs.pop('filter_arg', self.nested_append_arg)
        if not self.nested_allow_append:
            obj = queryset.create(
                **self._validate_nested(serializer_class, data, **kwargs).validated_data
            )
            return obj
        try:
            objects = queryset.model.objects.filter(
                **{filter_arg: data.get(self.nested_append_arg, None)}
            )
            obj = objects.get()
            self._check_permission_obj(objects)
        except exceptions.PermissionDenied:  # nocv
            raise
        except djexcs.ObjectDoesNotExist:
            obj = queryset.create(
                **self._validate_nested(serializer_class, data, **kwargs).validated_data
            )
        queryset.add(obj)
        return obj

    def _add_or_create_nested(self, queryset, data, serializer_class, **kwargs):
        many = isinstance(data, (list, tuple))
        filter_arg = self.nested_append_arg
        args = [serializer_class]
        if many:
            filter_arg += '__in'
            objects = queryset.model.objects.filter(**{
                filter_arg: [i.get(self.nested_append_arg) for i in data]
            })
            self._check_permission_obj(objects)
            queryset.add(*objects)
            args.append(objects)
        else:
            args.append(self._add_or_create_nested_one(
                queryset, data, serializer_class, filter_arg=filter_arg, **kwargs
            ))
        return self.get_route_serializer(*args, many=many, **kwargs)

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
    def get_view_methods(cls, detail=False):
        methods = []
        if hasattr(cls, 'create') and not detail:
            methods.append('post')
        if hasattr(cls, 'list') or hasattr(cls, 'retrieve'):
            methods.append('get')
        if hasattr(cls, 'update') and detail:
            methods.append('put')
        if hasattr(cls, 'partial_update') and detail:
            methods.append('patch')
        if hasattr(cls, 'destroy') and detail:
            methods.append('delete')
        return methods

    @classmethod
    def get_extra_actions(cls):
        return super(GenericViewSet, cls).get_extra_actions()

    @classmethod
    def as_view(cls, actions=None, **initkwargs):
        return super(GenericViewSet, cls).as_view(actions, **initkwargs)


class CopyMixin(GenericViewSet):
    copy_prefix = 'copy-'
    copy_field_name = 'name'
    copy_related = []

    def copy_instance(self, instance):
        new_instance = deepcopy(instance)
        new_instance.pk = None
        name = getattr(instance, self.copy_field_name, None)
        if isinstance(name, (six.string_types, six.text_type)):
            name = '{}{}'.format(self.copy_prefix, name)
        setattr(new_instance, self.copy_field_name, name)
        new_instance.save()
        for related_name in self.copy_related:
            new_related_manager = getattr(new_instance, related_name, None)
            if new_related_manager is not None:
                new_related_manager.set(getattr(instance, related_name).all())
        return new_instance

    @action(methods=['post'], detail=True)
    @transaction.atomic()
    def copy(self, request, **kwargs):
        # pylint: disable=unused-argument
        '''
        Copy instance with deps.
        '''
        instance = self.copy_instance(self.get_object())
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid()
        serializer.save()
        return Response(serializer.data, status.HTTP_201_CREATED).resp


class ModelViewSetSet(GenericViewSet, vsets.ModelViewSet):
    def create(self, request, *args, **kwargs):
        return super(ModelViewSetSet, self).create(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        return super(ModelViewSetSet, self).retrieve(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):  # nocv
        return super(ModelViewSetSet, self).update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):  # nocv
        return super(ModelViewSetSet, self).partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return super(ModelViewSetSet, self).destroy(request, *args, **kwargs)


class NonModelsViewSet(GenericViewSet):
    base_name = None

    def get_queryset(self):
        return QuerySet()  # nocv


class ListNonModelViewSet(NonModelsViewSet, vsets.mixins.ListModelMixin):
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
    pass


class HistoryModelViewSet(ReadOnlyModelViewSet, vsets.mixins.DestroyModelMixin):
    pass
