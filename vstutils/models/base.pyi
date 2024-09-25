from typing import Any, Optional, Sequence, Iterable, Text, Tuple, List, Dict, TypedDict, Union, Literal, Unpack

from rest_framework.serializers import Serializer, Field
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet as DrfGenericViewSet
from django_filters.filters import Filter
from django.db.models.base import ModelBase
from ..api.base import GenericViewSet


MethodsType = Literal['post', 'get', 'put', 'patch', 'delete', 'options', 'head']
ConstantViewType = Literal['read_only', 'list_only', 'history']
FilterFieldsListType = Iterable[Text]
FilterFieldsDictType = Dict[Text, Union[Filter, None]]

DEFAULT_VIEW_FIELD_NAMES: Tuple[Text,Text,Text,Text,Text]
LAZY_MODEL: object


class NestedModelOptionArgs(TypedDict, total=False):
    model: Union[Text, 'ModelBaseClass']
    override_params: Optional['ExtraMetadata']


class NestedViewOptionArgs(TypedDict, total=False):
    view: Union[Text, GenericViewSet]


NestedOptionType = Dict[Text, Union[NestedModelOptionArgs, NestedViewOptionArgs, dict]]

class ExtraMetadata(TypedDict, total=False):
    view_class: Optional[Union[Tuple, List[Union[Text, ConstantViewType]], Text, ConstantViewType]]
    serializer_class: Optional[Serializer]
    serializer_class_name: Optional[Text]
    list_fields: Optional[Iterable[Text]]
    detail_fields: Optional[Iterable[Text]]
    override_list_fields: Optional[bool]
    override_detail_fields: Optional[bool]
    view_field_name: Optional[Text]
    non_bulk_methods: Optional[Union[MethodsType, Iterable[MethodsType]]]
    properties_groups: Optional[Dict[Text, Sequence[Text]]]
    extra_serializer_classes: Optional[Dict[Text, Serializer]]
    filterset_fields: Optional[Dict[Text, Union[FilterFieldsListType, FilterFieldsDictType]]]
    search_fields: Optional[Iterable[Text]]
    copy_attrs: Optional[Dict[Text, Any]]
    nested: Optional[NestedOptionType]
    extra_view_attributes: Optional[NestedOptionType]
    hidden: Optional[bool]

    pre_filter_backends: Optional[DrfGenericViewSet.filter_backends]
    filter_backends: Optional[DrfGenericViewSet.filter_backends]
    override_filter_backends: Optional[bool]

    pre_permission_classes: Optional[APIView.permission_classes]
    permission_classes: Optional[APIView.permission_classes]
    override_permission_classes: Optional[bool]

    pre_authentication_classes: Optional[APIView.authentication_classes]
    authentication_classes: Optional[APIView.authentication_classes]
    override_authentication_classes: Optional[bool]

    pre_throttle_classes: Optional[APIView.throttle_classes]
    throttle_classes: Optional[APIView.throttle_classes]
    override_throttle_classes: Optional[bool]

    pre_renderer_classes: Optional[APIView.renderer_classes]
    renderer_classes: Optional[APIView.renderer_classes]
    override_renderer_classes: Optional[bool]

    pre_parser_classes: Optional[APIView.parser_classes]
    parser_classes: Optional[APIView.parser_classes]
    override_parser_classes: Optional[bool]


default_extra_metadata: ExtraMetadata


def get_proxy_labels(model: ModelBase) -> Tuple:
    ...


def get_first_match_name(field_names: Sequence[Text], default: Optional[Text] = None) -> Text:
    ...


class ModelBaseClass(ModelBase):
    generated_view: GenericViewSet
    lazy_generated_view: GenericViewSet
    OriginalMeta: Any

    def get_extra_metadata(cls) -> ExtraMetadata:
        ...

    def get_view_class(
        cls,
        view_class: Optional[Union[Tuple, List[Union[Text, ConstantViewType]], Text, ConstantViewType]] = None,

        serializer_class: Optional[Serializer] = None,
        serializer_class_name: Optional[Text] = None,

        list_fields: Optional[Iterable[Text]] = None,
        detail_fields: Optional[Iterable[Text]] = None,
        override_list_fields: Optional[Dict[str, Field]] = None,
        override_detail_fields: Optional[Dict[str, Field]] = None,
        hidden_on_frontend_list_fields: Optional[List[str]] = None,
        hidden_on_frontend_detail_fields: Optional[List[str]] = None,

        view_field_name: Optional[Text] = None,
        non_bulk_methods: Optional[Union[MethodsType, Iterable[MethodsType]]] = None,
        properties_groups: Optional[Dict[Text, Sequence[Text]]] = None,
        detail_operations_availability_field_name: Optional[Text] = None,

        extra_serializer_classes: Optional[Dict[Text, Serializer]] = None,
        filterset_fields: Optional[Union[FilterFieldsListType, FilterFieldsDictType]] = None,
        search_fields: Optional[Iterable[Text]] = None,
        copy_attrs: Optional[Dict[Text, Any]] = None,

        nested: Optional[NestedOptionType] = None,
        extra_view_attributes: Optional[NestedOptionType] = None,

        hidden: Optional[bool] = None,

        pre_filter_backends: Optional[DrfGenericViewSet.filter_backends] = None,
        filter_backends: Optional[DrfGenericViewSet.filter_backends] = None,
        override_filter_backends: Optional[bool] = None,

        pre_permission_classes: Optional[APIView.permission_classes] = None,
        permission_classes: Optional[APIView.permission_classes] = None,
        override_permission_classes: Optional[bool] = None,

        pre_authentication_classes: Optional[APIView.authentication_classes] = None,
        authentication_classes: Optional[APIView.authentication_classes] = None,
        override_authentication_classes: Optional[bool] = None,

        pre_throttle_classes: Optional[APIView.throttle_classes] = None,
        throttle_classes: Optional[APIView.throttle_classes] = None,
        override_throttle_classes: Optional[bool] = None,

        pre_renderer_classes: Optional[APIView.renderer_classes] = None,
        renderer_classes: Optional[APIView.renderer_classes] = None,
        override_renderer_classes: Optional[bool] = None,

        pre_parser_classes: Optional[APIView.parser_classes] = None,
        parser_classes: Optional[APIView.parser_classes] = None,
        override_parser_classes: Optional[bool] = None,
    ) -> GenericViewSet:
        ...

    def get_lazy_generated_view(cls, **extra_metadata: Unpack[ExtraMetadata]) -> GenericViewSet:
        ...
