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
    action_serializers = {}

    def filter_for_filter_backends(self, backend):
        return getattr(backend, 'required', False)

    def filter_queryset(self, queryset):
        if hasattr(self, 'nested_name'):
            self.filter_backends = list(filter(
                self.filter_for_filter_backends,
                self.filter_backends
            ))
        return super(GenericViewSet, self).filter_queryset(queryset)

    @classproperty
    def serializer_class_one(self):
        return self._serializer_class_one or self.serializer_class

    def get_serializer_class(self):
        lookup_field = self.lookup_url_kwarg or self.lookup_field or 'pk'
        detail_actions = ['create', 'retrieve', 'update', 'partial_update']
        lookup_field_data = self.kwargs.get(lookup_field, False)
        action_name = getattr(self, 'action', None)
        # Try to get overloaded serializer from 'action_serializers' or from attrs
        serializer_class = getattr(self, 'serializer_class_{}'.format(action_name), None)
        serializer_class = serializer_class or self.action_serializers.get(action_name, None)
        if serializer_class:
            return serializer_class
        # Get 'serializer_class_one' for detail operations
        if self.request and (lookup_field_data or self.action in detail_actions):
            return self.serializer_class_one
        return super(GenericViewSet, self).get_serializer_class()

    def nested_allow_check(self):
        '''
        Just raise or pass
        :return:
        '''
        pass

    @classmethod
    def get_view_methods(cls, detail=False):
        attr_name = ''.join(['__', 'detail' if detail else 'list', 'http_methods', '__'])
        methods = getattr(cls, attr_name, None)
        if methods is not None:
            return methods
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
        setattr(cls, attr_name, methods)
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
    # pylint: disable=useless-super-delegation
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
            method: reverse("{}-{}".format(self.base_name, method), request=request)
            for method in self.methods
        }
        return Response(routes, status.HTTP_200_OK).resp


class ReadOnlyModelViewSet(GenericViewSet, vsets.ReadOnlyModelViewSet):
    pass


class HistoryModelViewSet(ReadOnlyModelViewSet, vsets.mixins.DestroyModelMixin):
    pass
