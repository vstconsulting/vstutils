import typing as _t
import collections
import enum
import logging
from . import fields as fields, responses as responses
from ..utils import classproperty as classproperty, get_if_lazy as get_if_lazy, patch_gzip_response_decorator as patch_gzip_response_decorator, raise_context_decorator_with_default as raise_context_decorator_with_default
from .filter_backends import get_serializer_readable_fields as get_serializer_readable_fields
from .serializers import ErrorSerializer as ErrorSerializer, OtherErrorsSerializer as OtherErrorsSerializer, ValidationErrorSerializer as ValidationErrorSerializer, serializers as serializers
from django.db import models
from django.db.models.query import QuerySet
from django.http.response import FileResponse, HttpResponseNotModified
from rest_framework import exceptions, mixins as drf_mixins, views as rvs, viewsets as vsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response as RestResponse
from rest_framework.schemas import AutoSchema as DRFAutoSchema
from rest_framework.serializers import BaseSerializer

T = _t.TypeVar('T')

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
non_optimizeable_fields = (
    fields.NamedBinaryFileInJsonField,
    serializers.PrimaryKeyRelatedField,
    serializers.BaseSerializer,
    serializers.SerializerMethodField,
)
logger: logging.Logger
http404_re_translate: _t.Pattern

def _get_cleared(qs: QuerySet) -> QuerySet: ...
def apply_translation(obj: T, trans_function: _t.Callable[[...], _t.Text]) -> T: ...
def exception_handler(exc: Exception, context: _t.Any) -> _t.Optional[RestResponse]: ...

class AutoSchema(DRFAutoSchema): ...

class QuerySetMixin(rvs.APIView):
    queryset: _t.Optional[_t.Union[QuerySet, models.Manager]]
    _queryset: _t.Optional[_t.Union[QuerySet, models.Manager]]
    model: _t.Optional[_t.Type[models.Model]]
    def _base_get_queryset(self) -> QuerySet: ...
    def get_extra_queryset(self) -> QuerySet: ...
    def get_queryset(self) -> QuerySet: ...

class GenericViewSetMeta(type):
    def __new__(mcs, name, bases, attrs): ...
    def __get_http_methods_attr_name(cls, detail: bool) -> _t.Text: ...

class GenericViewSet(QuerySetMixin, vsets.GenericViewSet, metaclass=GenericViewSetMeta):
    optimize_get_by_values: bool
    optimize_get_by_values_actions: _t.Tuple
    select_related: bool
    serializer_class: _t.ClassVar[_t.Type[serializers.Serializer]]
    _serializer_class_one: _t.Optional[_t.Type[serializers.Serializer]]
    query_serializer: _t.ClassVar[_t.Optional[_t.Type[serializers.Serializer]]]
    model: _t.ClassVar[_t.Optional[_t.Type[models.Model]]]
    action_serializers: _t.Dict[_t.Text, serializers.Serializer]
    filter_backends: _t.ClassVar[_t.Union[_t.Tuple, _t.List]]

    def create_action_serializer(self, *args, **kwargs) -> serializers.Serializer: ...
    def filter_for_filter_backends(self, backend) -> bool: ...
    def get_query_serialized_data(self, request: Request, query_serializer: _t.Type[BaseSerializer] = ..., raise_exception: bool = ...) -> _t.Union[dict, collections.OrderedDict]: ...
    def nested_allow_check(self) -> None: ...
    @classmethod
    def get_view_methods(cls, detail: bool = ...) -> _t.List[_t.Text]: ...

def get_etag_value(
        view: GenericViewSet,
        model_class: _t.Union[_t.Type[models.Model], _t.List[_t.Type[models.Model]], _t.Set[_t.Type[models.Model]]],
        request: Request, pk: _t.Optional[_t.Any] = ...
) -> _t.Text: ...

class EtagDependency(enum.Flag):
    USER: enum.auto()
    SESSION: enum.auto()
    LANG: enum.auto()

class CachableHeadMixin(GenericViewSet):
    class NotModifiedException(exceptions.APIException): ...
    class PreconditionFailedException(exceptions.APIException): ...
    @property
    def model_class(self) -> models.Model: ...
    @property
    def is_main_action(self) -> bool: ...
    def get_etag_value(self, model_class: _t.Type[models.Model], request: Request, pk: _t.Any = ...) -> _t.Text: ...
    def _get_etag(self, model_class: _t.Type[models.Model], request: Request) -> _t.Text: ...
    def should_check_action(self, method: _t.Text) -> bool: ...
    def check_etag(self, request: Request, model_class: _t.Optional[_t.Type[models.Model]] = ...) -> _t.Union[None, _t.NoReturn]: ...

class CopyMixin(GenericViewSet):
    copy_prefix: str
    copy_field_name: str
    copy_related: _t.Iterable[_t.Text]
    def copy_instance(self, instance: models.Model) -> models.Model: ...
    @action(methods=['post'], detail=True)
    def copy(self, request: Request, **kwargs) -> responses.BaseResponseClass: ...

class FileResponseRetrieveMixin(GenericViewSet):
    instance_field_data: _t.Text
    instance_field_filename: _t.Text
    instance_field_timestamp: _t.Optional[_t.Text]
    cache_control_header_data: _t.Optional[_t.Text]
    serializer_class_retrieve = FileResponse
    def get_file_response_kwargs(self, instance: models.Model) -> _t.Dict: ...
    def retrieve(self, request: Request, *args, **kwargs) -> _t.Union[FileResponse, HttpResponseNotModified]: ...

class ModelViewSet(GenericViewSet, vsets.ModelViewSet): ...

class NonModelsViewSet(GenericViewSet):
    base_name: _t.Optional[_t.Text]

    def get_queryset(self) -> QuerySet: ...

class ListNonModelViewSet(NonModelsViewSet, drf_mixins.ListModelMixin):
    schema = None
    @property
    def methods(self) -> _t.Iterable[_t.Text]: ...

class ReadOnlyModelViewSet(GenericViewSet, vsets.ReadOnlyModelViewSet): ...
class ListOnlyModelViewSet(GenericViewSet, drf_mixins.ListModelMixin): ...
class HistoryModelViewSet(ReadOnlyModelViewSet, drf_mixins.DestroyModelMixin): ...
