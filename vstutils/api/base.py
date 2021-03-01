"""
Default ViewSets for web-api.
"""

import sys
import logging
import inspect
import traceback
import datetime
import typing as _t
from collections import namedtuple
from copy import deepcopy

from django.conf import settings
from django.core import exceptions as djexcs
from django.http.response import Http404, FileResponse, HttpResponseNotModified
from django.db.models.query import QuerySet
from django.db import transaction, models
from rest_framework.reverse import reverse
from rest_framework import viewsets as vsets, views as rvs, exceptions, status
from rest_framework.serializers import BaseSerializer
from rest_framework.response import Response as RestResponse
from rest_framework.request import Request
from rest_framework.decorators import action
from rest_framework.schemas import AutoSchema as DRFAutoSchema

from ..exceptions import VSTUtilsException
from ..utils import classproperty, deprecated, get_if_lazy, raise_context_decorator_with_default
from . import responses
from .serializers import (
    ErrorSerializer,
    ValidationErrorSerializer,
    OtherErrorsSerializer,
    serializers
)

_ResponseClass: _t.Type[_t.NamedTuple] = namedtuple("ResponseData", [
    "data", "status"
])
default_methods: _t.List[_t.Text] = [
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'options',
    'head'
]
detail_actions: _t.Tuple[_t.Text, _t.Text, _t.Text, _t.Text] = (
    'create',
    'retrieve',
    'update',
    'partial_update'
)
main_actions: _t.Tuple[_t.Text, _t.Text, _t.Text, _t.Text, _t.Text] = ('list',) + detail_actions
query_check_params = (
    'extra_select',
    'annotations_select'
)
default_cache_control_header_data = 'private, no-cache'
logger: logging.Logger = logging.getLogger(settings.VST_PROJECT)


def _get_cleared(qs):
    return getattr(qs, 'cleared', lambda: qs)()


def exception_handler(exc: Exception, context: _t.Any) -> _t.Optional[RestResponse]:
    traceback_str: _t.Text = traceback.format_exc()
    default_exc = (exceptions.APIException, djexcs.PermissionDenied)
    serializer_class = ErrorSerializer
    data: _t.Optional[_t.Dict[_t.Text, _t.Any]] = None
    code: _t.SupportsInt = status.HTTP_400_BAD_REQUEST

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
            errors = dict(exc)  # type: ignore
        elif hasattr(exc, 'error_list'):
            errors = {'other_errors': list(exc)}
        else:
            errors = {'other_errors': str(exc)}  # type: ignore
        data = {"detail": errors}
        serializer_class = ValidationErrorSerializer
        logger.debug(traceback_str)

    elif isinstance(exc, VSTUtilsException):  # nocv
        data = {"detail": exc.msg, 'error_type': sys.exc_info()[0].__name__}  # type: ignore
        code = exc.status
        serializer_class = OtherErrorsSerializer
        logger.info(traceback_str)

    elif not isinstance(exc, default_exc) and isinstance(exc, Exception):
        data = {
            'detail': str(sys.exc_info()[1]), 'error_type': sys.exc_info()[0].__name__  # type: ignore
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
            return responses.BaseResponseClass(serializer.data, code)

    logger.info(traceback_str)
    default_response = rvs.exception_handler(exc, context)

    if isinstance(exc, exceptions.NotAuthenticated):  # nocv
        default_response["X-Anonymous"] = "true"  # type: ignore

    return default_response


# TODO deprecated
@deprecated
class Response(_ResponseClass):

    def _asdict(self):
        data = super()._asdict()
        data["status"] = data.get("status", status.HTTP_200_OK)
        if isinstance(data["data"], str):
            data["data"] = {'detail': self.data}
        return data

    @property
    def resp(self):
        return responses.BaseResponseClass(**self._asdict())

    @property
    def resp_dict(self):
        return self._asdict()  # nocv


class AutoSchema(DRFAutoSchema):

    def get_description(self, path: _t.Text, method: _t.Text) -> _t.Text:
        # pylint: disable=simplifiable-if-statement,redefined-outer-name
        method_name: _t.Text = getattr(self.view, 'action', method.lower())
        method_obj: _t.Optional[_t.Callable] = getattr(self.view, method_name, None)
        method_view: _t.Optional[_t.Type[rvs.APIView]] = (
            getattr(method_obj, '_nested_view', None)
            if method_obj else None
        )
        method_view = get_if_lazy(method_view)

        if method_obj.__doc__:
            return method_obj.__doc__.strip()
        if not method_view:
            if not self.view.__class__.__doc__:
                model = getattr(self.view, 'model', None)
                if model is not None and model.__doc__:
                    self.view.__class__.__doc__ = model.__doc__
            return super().get_description(path, method)

        method_view_obj = method_view()
        action = path.split('/')[-2]
        submethod = getattr(method_view, action, None)
        if submethod.__doc__:
            return str(submethod.__doc__).strip()  # nocv
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
        method_view_obj.action = action  # type: ignore
        if method_view_obj.schema is None:
            return 'No description'  # nocv
        return method_view_obj.schema.get_description(path, method)  # type: ignore


class QuerySetMixin(rvs.APIView):
    """
    Instance REST operations.
    """
    __slots__ = ()
    queryset: _t.Optional[QuerySet]
    _queryset: _t.Optional[QuerySet] = None
    model: _t.Optional[_t.Type[models.Model]] = None

    @classproperty  # type: ignore
    def queryset(self) -> QuerySet:
        # pylint: disable=method-hidden,function-redefined
        if self._queryset is not None:
            return _get_cleared(self._queryset)
        return _get_cleared(self.model.objects.all())

    @queryset.setter  # type: ignore
    def queryset(self, value):
        self._queryset = value

    def _base_get_queryset(self) -> QuerySet:
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

    def get_extra_queryset(self) -> _t.Optional[QuerySet]:
        return self.queryset

    def get_queryset(self) -> QuerySet:
        if self.queryset is None:  # nocv
            assert self.model is not None, (
                "'%s' should either include a `queryset` or `model` attribute,"
                " or override the `get_queryset()` method."
                % self.__class__.__name__
            )
            self.queryset = _get_cleared(self.model.objects.all())
        self.queryset = self.get_extra_queryset()
        return self._base_get_queryset()


class GenericViewSetMeta(type(vsets.GenericViewSet)):  # type: ignore
    def __new__(mcs, name, bases, attrs):
        new_class = super().__new__(mcs, name, bases, attrs)
        for detail in (True, False):
            setattr(new_class, mcs.__get_http_methods_attr_name(new_class, detail), None)
        return new_class

    def __get_http_methods_attr_name(cls, detail):
        return ''.join(['__', 'detail' if detail else 'list', 'http_methods', '__'])


class GenericViewSet(QuerySetMixin, vsets.GenericViewSet, metaclass=GenericViewSetMeta):
    __slots__ = ()
    optimize_get_by_values = settings.OPTIMIZE_GET_BY_VALUES
    select_related = False
    serializer_class: _t.Type[serializers.Serializer]
    _serializer_class_one: _t.Optional[_t.Type[serializers.Serializer]] = None
    model: _t.Optional[_t.Type[models.Model]] = None
    action_serializers: _t.Dict[_t.Text, serializers.Serializer] = {}
    _nested_args: _t.Dict[_t.Text, _t.Any]
    _nested_view: _t.ClassVar[_t.Union[QuerySetMixin, vsets.GenericViewSet]]
    nested_detail: bool

    def filter_for_filter_backends(self, backend):
        return getattr(backend, 'required', False)

    @raise_context_decorator_with_default(default=set())
    def _get_selectable_fields(self, qs):
        result = {f.name for f in qs.model._meta.fields}

        for extra in filter(bool, map(lambda x: getattr(qs.query, x, None), query_check_params)):
            result.update(extra.keys())

        return result

    def filter_queryset(self, queryset: QuerySet):
        if hasattr(self, 'nested_name'):
            self.filter_backends = filter(  # type: ignore
                self.filter_for_filter_backends,
                self.filter_backends
            )
        qs = super().filter_queryset(queryset)

        if self.action in ('list', 'retrieve') and self.optimize_get_by_values:
            # pylint: disable=protected-access

            serializer_class = self.get_serializer_class()
            if issubclass(serializer_class, BaseSerializer):
                read_fields = {f.field_name for f in serializer_class()._readable_fields}

                if read_fields.issubset(self._get_selectable_fields(qs)):
                    qs = qs.values(*read_fields)

        return qs

    def get_serializer_class(self):
        lookup_field = self.lookup_url_kwarg or self.lookup_field or 'pk'
        action_name = getattr(self, 'action', None)

        # Try to get overloaded serializer from 'action_serializers' or from attrs
        serializer_class = getattr(self, f'serializer_class_{action_name}', None)
        if serializer_class:
            return serializer_class
        if action_name in self.action_serializers:
            serializer_class = self.action_serializers.get(action_name, None)
            if serializer_class:
                return serializer_class

        if action_name not in main_actions:
            view_func = getattr(self, action_name)
            serializer_class = view_func.kwargs.get('serializer_class', None)
            if serializer_class:
                return serializer_class

        is_detail = (
            hasattr(self, 'serializer_class_one') and
            self.request and
            (
                action_name in detail_actions or
                (
                    self.kwargs.get(lookup_field, False) and
                    action_name in main_actions
                )
            )
        )

        # Get 'serializer_class_one' for detail operations
        if is_detail:
            return self.serializer_class_one  # pylint: disable=no-member
        return super().get_serializer_class()

    def get_serializer(self, *args: _t.Any, **kwargs: _t.Any) -> BaseSerializer:
        """
        Return the serializer instance that should be used for validating and
        deserializing input, and for serializing output.

        Provide to use :class:`django.http.StreamingHttpResponse` as serializer init.
        """
        serializer_class = self.get_serializer_class()
        if issubclass(serializer_class, BaseSerializer):
            kwargs.setdefault('context', self.get_serializer_context())
        return serializer_class(*args, **kwargs)

    def nested_allow_check(self):
        """
        Just raise or pass
        :return:
        """

    @classmethod
    def get_view_methods(cls, detail=False) -> _t.List[_t.Text]:
        attr_name = ''.join(['__', 'detail' if detail else 'list', 'http_methods', '__'])
        methods = getattr(cls, attr_name, None)
        if methods is not None:
            return methods
        methods = []
        if not detail and hasattr(cls, 'create'):
            methods.append('post')
        if hasattr(cls, 'list') or hasattr(cls, 'retrieve'):
            methods.append('get')
        if detail and hasattr(cls, 'update'):
            methods.append('put')
        if detail and hasattr(cls, 'partial_update'):
            methods.append('patch')
        if detail and hasattr(cls, 'destroy'):
            methods.append('delete')
        setattr(cls, attr_name, methods)
        return methods

    @classmethod
    def get_extra_actions(cls):
        return super().get_extra_actions()

    @classmethod
    def as_view(cls, actions=None, **initkwargs):
        return super().as_view(actions, **initkwargs)


class CopyMixin(GenericViewSet):
    """ Mixin for viewsets which adds `copy` endpoint to view. """

    __slots__ = ()
    #: Value of prefix which will be added to new instance name.
    copy_prefix = 'copy-'
    #: Name of field which will get a prefix.
    copy_field_name = 'name'
    #: List of related names which will be copied to new instance.
    copy_related: _t.Iterable[_t.Text] = ()

    def copy_instance(self, instance):
        new_instance = deepcopy(instance)
        new_instance.pk = None
        name = getattr(instance, self.copy_field_name, None)
        if isinstance(name, str):
            name = f'{self.copy_prefix}{name}'
        setattr(new_instance, self.copy_field_name, name)
        new_instance.save()
        for related_name in self.copy_related:
            new_related_manager = getattr(new_instance, related_name, None)
            if new_related_manager is not None:
                new_related_manager.set(getattr(instance, related_name).all())
        return new_instance

    @action(methods=['post'], detail=True)
    @transaction.atomic()
    def copy(self, request: Request, **kwargs) -> responses.BaseResponseClass:
        # pylint: disable=unused-argument
        """
        Endpoint which copy instance with deps.
        """
        instance = self.copy_instance(self.get_object())
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid()
        serializer.save()
        return responses.HTTP_201_CREATED(serializer.data)


class FileResponseRetrieveMixin(GenericViewSet):
    """
    ViewSet mixin for retriving FileResponse from models with file fields data.

    Example:

        .. literalinclude:: ../test_src/test_proj/models/files.py
           :lines: 1-20,54-76
    """
    instance_field_data: _t.Text
    instance_field_filename: _t.Text = 'filename'
    instance_field_timestamp: _t.Optional[_t.Text] = None
    cache_control_header_data: _t.Optional[_t.Text] = None
    serializer_class_retrieve = FileResponse

    def get_file_response_kwargs(self, instance):
        return {
            "streaming_content": getattr(instance, self.instance_field_data),
            "as_attachment": True,
            "filename": getattr(instance, self.instance_field_filename, '')
        }

    def retrieve(self, request: Request, *args, **kwargs) -> _t.Union[FileResponse, HttpResponseNotModified]:
        instance = self.get_object()

        instance_edit_timestamp = None
        if self.instance_field_timestamp:
            instance_edit: datetime.datetime = getattr(instance, self.instance_field_timestamp, None)
            instance_edit_timestamp = instance_edit.timestamp() if instance_edit else None

        if instance_edit_timestamp and instance_edit_timestamp == float(request.META.get('HTTP_IF_NONE_MATCH', '0.0')):
            return HttpResponseNotModified()

        response: FileResponse = self.get_serializer(**self.get_file_response_kwargs(instance))  # type: ignore

        if self.instance_field_timestamp and instance_edit_timestamp:
            cache_control_header_data = getattr(self, 'cache_control_header_data', None)
            if cache_control_header_data is None:
                cache_control_header_data = default_cache_control_header_data
            response['Cache-Control'] = cache_control_header_data
            response['ETag'] = str(instance_edit_timestamp)
        return response


class ModelViewSet(GenericViewSet, vsets.ModelViewSet):
    # pylint: disable=useless-super-delegation

    """
    A viewset that provides default `create()`, `retrieve()`, `update()`,
    `partial_update()`, `destroy()` and `list()` actions under model.

    :var model: DB model with data.
    :vartype model: vstutils.models.BModel
    :var serializer_class: Serializer for view of Model data.
    :vartype serializer_class: vstutils.api.serializers.VSTSerializer
    :var serializer_class_one: Serializer for view one instance of Model data.
    :vartype serializer_class_one: vstutils.api.serializers.VSTSerializer
    :var serializer_class_[ACTION_NAME]: Serializer for view of any endpoint like `.create`.
    :vartype serializer_class_[ACTION_NAME]: vstutils.api.serializers.VSTSerializer


    Examples:
        .. sourcecode:: python

            from vstutils.api.base import ModelViewSet
            from . import serializers as sers


            class StageViewSet(ModelViewSet):
                # This is difference with DRF:
                # we use model instead of queryset
                model = sers.models.Stage
                # Serializer for list view (view for a list of Model instances
                serializer_class = sers.StageSerializer
                # Serializer for page view (view for one Model instance).
                # This property is not required, if its value is the same as `serializer_class`.
                serializer_class_one = sers.StageSerializer
                # Allowed to set decorator to custom endpoint like this:
                # serializer_class_create - for create method
                # serializer_class_copy - for detail endpoint `copy`.
                # etc...

    """


class NonModelsViewSet(GenericViewSet):
    __slots__ = ()
    base_name = None

    def get_queryset(self) -> QuerySet:
        return QuerySet()  # nocv


class ListNonModelViewSet(NonModelsViewSet, vsets.mixins.ListModelMixin):
    # pylint: disable=abstract-method
    __slots__ = ()
    schema = None  # type: ignore

    @property
    def methods(self) -> _t.Iterable[_t.Text]:
        def is_list_action(attr):
            if not inspect.isfunction(attr):
                return False
            elif not hasattr(attr, 'url_path'):
                return False
            elif getattr(attr, 'detail', True):
                return False
            return True

        return map(lambda x: x[0].replace('_', "-"), inspect.getmembers(self.__class__, is_list_action))

    def list(self, request: Request, *args, **kwargs) -> responses.BaseResponseClass:
        routes = {
            method: reverse(f"{request.version}:{self.base_name}-{method}", request=request)
            for method in self.methods
        }
        return responses.HTTP_200_OK(routes)


class ReadOnlyModelViewSet(GenericViewSet, vsets.ReadOnlyModelViewSet):
    """ Default viewset like vstutils.api.base.ModelViewSet for readonly models. """
    __slots__ = ()


class ListOnlyModelViewSet(GenericViewSet, vsets.mixins.ListModelMixin):
    """ Default viewset like vstutils.api.base.ModelViewSet for list only models. """
    __slots__ = ()


class HistoryModelViewSet(ReadOnlyModelViewSet, vsets.mixins.DestroyModelMixin):
    """
    Default viewset like ReadOnlyModelViewSet but for historical data
    (allow to delete, but cannt create and update).
    """
    __slots__ = ()
