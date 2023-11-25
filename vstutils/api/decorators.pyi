from typing import Any, Callable, TypeVar, Iterable, Optional, Set, ClassVar, Type, Tuple, Dict, Union, NoReturn, List, Iterator
import abc
from django.db.models import Model, QuerySet, Manager
from django.db.models.manager import RelatedManager
from django.http.response import HttpResponseBase
from rest_framework import views, viewsets, generics, filters, decorators, mixins, serializers, permissions, request as drf_request, response as drf_response
from .base import GenericViewSet

T = TypeVar("T")
_VIEW = TypeVar("_VIEW", bound=Callable[..., HttpResponseBase])
GenericViewSetDecoratorType = Callable[[generics.GenericAPIView], generics.GenericAPIView]
QuerySetFiltersMethodsType = Callable[[Model, QuerySet], QuerySet]
ActionType = Callable[[Union[_VIEW, decorators._View]], decorators.ViewSetAction[_VIEW]]
action = decorators.action
DecoratedActionType = Union[DecoratedActionMixin, decorators.ViewSetAction]


def _create_with_iteration(
        view: Union[GenericViewSet, mixins.CreateModelMixin],
        get_serializer_func: Callable[..., serializers.Serializer],
        nested_manager: RelatedManager,
        data: dict
) -> Model:
    ...


class GenericViewSetInNested(GenericViewSet):
    nested_detail: bool
    nested_allow_append: bool


def get_action_name(master_view: GenericViewSetInNested, method: str = '') -> Optional[str]:
    ...


def subaction(
        methods: Iterable[str] = ('post',),
        detail: bool = None,
        multiaction: bool = False,
        require_confirmation: bool = False,
        is_list: bool = False,
        serializer_class: serializers.Serializer = None,
        response_serializer: serializers.Serializer = None,
        query_serializer: serializers.Serializer = None,
        response_code: int = None,
        permission_classes: Iterable[permissions.BasePermission] = None,
        url_path: str = None,
        description: str = None,
        title: str = None,
        icons: List[str] = None
) -> Callable[[_VIEW], _VIEW]: ...


class DecoratedActionMixin:
    _nested_args: dict
    _nested_manager: Union[str, Callable[[Model], Union[QuerySet, Manager]]]
    _nested_view: generics.GenericAPIView
    _nested_name: str
    _nested_subname: str
    _nested_wrapped_view: 'ApiView'


class ApiView(views.APIView):
    _nested_wrapped_view: 'ApiView'


class NestedViewMixin(viewsets.GenericViewSet):
    nested_manager: Union[QuerySet, Manager]
    queryset_filters: Iterable[QuerySetFiltersMethodsType]
    nested_parent_object: Model
    master_view: GenericViewSetInNested
    nested_allow_append: bool
    nested_id: Union[str, int]
    nested_append_arg: str

    request: drf_request.Request
    check_permissions: Callable[[drf_request.Request], Any]  # type: ignore
    check_throttles: Callable[[drf_request.Request], Any]  # type: ignore
    perform_create: Optional[Callable[[serializers.Serializer], None]]

    def get_serializer_context(self) -> Dict[str, Any]:
        ...

    def finalize_response(self, request: drf_request.Request, response: HttpResponseBase, *args: Any, **kwargs: Any) -> drf_response.Response:
        ...

    def _check_permission_obj(self, objects: Iterable) -> Optional[NoReturn]:
        ...

    def _data_create(self, request_data, nested_append_arg: str) -> List[Union[str, int]]:
        ...

    def create(self, request: drf_request.Request, *_, **__) -> HttpResponseBase:
        ...


class NestedWithoutAppendMixin(NestedViewMixin):
    ...


class NestedWithAppendMixin(NestedWithoutAppendMixin):
    ...


class BaseClassDecorator(metaclass=abc.ABCMeta):
    name: str
    arg: str
    request_arg: str
    args: tuple
    kwargs: dict

    def __init__(self, name: str, arg: Optional[str], *args, **kwargs):
        ...

    @abc.abstractmethod
    def setup(self, view_class: generics.GenericAPIView) -> generics.GenericAPIView:
        ...

    def __call__(self, view_class: generics.GenericAPIView) -> generics.GenericAPIView:
        ...

    def decorator(self, view_class: generics.GenericAPIView) -> generics.GenericAPIView:
        ...


class nested_view(BaseClassDecorator):
    arg: Optional[str]  # type: ignore
    view: generics.GenericAPIView
    allow_append: bool
    append_arg: Optional[str]
    manager_name: Union[str, Callable[[Model], Union[QuerySet, Manager]]]
    methods: Iterable[str]
    queryset_filters: Iterable[QuerySetFiltersMethodsType]
    allowed_subs: Optional[Iterable[str]]
    empty_arg: bool
    _subs: Set[str]

    filter_subs: ClassVar[tuple] = ('filter',)

    NoView: ClassVar[Type[Exception]]

    def __init__(
            self,
            name: str,
            arg: Optional[str],
            view: generics.GenericAPIView,
            allow_append: bool = False,
            manager_name: Union[str, Callable[[Model], Union[QuerySet, Manager]]] = '',
            queryset_filters: Iterable[QuerySetFiltersMethodsType] = (),
            methods: Iterable[str] = (),
            subs: Optional[Iterable[str]] = None,
            append_arg: Optional[str] = None,
            empty_arg: bool = False,
            *args,
            **kwargs
    ): ...

    def _get_subs_from_view(self) -> Iterable[str]:
        ...

    def get_subs(self) -> Set[str]:
        ...

    def get_view(self, name: str, **options) -> Tuple[str, ApiView]:
        ...

    def get_view_type(self, type_name: str, **options) -> Tuple[str, ApiView]:
        ...

    def get_list_view(self, **options) -> Tuple[str, ApiView]:
        ...

    def get_detail_view(self, **options) -> Tuple[str, ApiView]:
        ...

    def get_sub_view(self, sub, **options) -> Tuple[str, ApiView]:
        ...

    def get_decorator(self, detail: bool = False, **options) -> ActionType:
        ...

    def _filter_methods(self, methods: Iterable[str], detail: bool = False) -> Set[str]:
        ...

    def decorated(self, detail: bool) -> Tuple[str, DecoratedActionType]:
        ...

    def _get_decorated_sub(self, sub: str) -> Tuple[str, DecoratedActionType]:
        ...

    def decorated_list(self):
        return self.decorated(detail=False)

    def decorated_detail(self):
        return self.decorated(detail=True)

    def generate_decorated_subs(self) -> Iterator[Tuple[str, DecoratedActionType]]:
        ...

    def setup(self, view_class: generics.GenericAPIView) -> generics.GenericAPIView:
        ...


def extend_viewset_attribute(name, override=False, data=None) -> GenericViewSetDecoratorType:
    ...

def extend_filterbackends(backends: Iterable[filters.BaseFilterBackend], override: bool = False) -> GenericViewSetDecoratorType:
    ...

def cache_method_result(func: Callable[..., T]) -> Callable[..., T]:
    ...
