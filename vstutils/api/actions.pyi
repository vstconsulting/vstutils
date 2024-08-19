import typing as _t
from datetime import datetime
from .pagination import SimpleCountedListPagination as SimpleCountedListPagination
from .responses import BaseResponseClass as BaseResponseClass, HTTP_200_OK as HTTP_200_OK, HTTP_201_CREATED as HTTP_201_CREATED, HTTP_204_NO_CONTENT as HTTP_204_NO_CONTENT
from .serializers import DataSerializer as DataSerializer, EmptySerializer as EmptySerializer
from django.http.request import HttpRequest
from django.http.response import HttpResponseBase, FileResponse
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import serializers, viewsets as viewsets
from rest_framework.decorators import ViewSetAction



class SimpleActionObject(_t.Protocol):
    def setter(self, func: _t.Callable) -> _t.Union[ViewSetAction, 'SimpleActionObject']: ...
    def deleter(self, func: _t.Callable) -> _t.Union[ViewSetAction, 'SimpleActionObject']: ...


class SimpleFileActionObject(_t.Protocol):
    def pre_data(self, func: _t.Callable) -> _t.Union[ViewSetAction, 'SimpleFileActionObject']: ...
    def modified_since(self, func: _t.Callable) -> _t.Union[ViewSetAction, 'SimpleFileActionObject']: ...


class DummyAtomic:
    def __init__(self, *args, **kwargs) -> None: ...
    def __enter__(self): ...
    def __exit__(self, exc_type, exc_val, exc_tb) -> None: ...

class Action:
    method_response_mapping: _t.Dict[_t.Text, _t.Type[BaseResponseClass]]
    detail: bool
    methods: _t.Optional[_t.List[_t.Text]]
    serializer_class: _t.Type[serializers.Serializer]
    result_serializer_class: _t.Optional[_t.Type[serializers.Serializer]]
    query_serializer: _t.Optional[_t.Type[serializers.Serializer]]
    multi: bool
    title: _t.Optional[_t.Text]
    icons: _t.Optional[_t.Union[_t.Text, _t.Iterable]]
    is_list: bool
    edit_only: bool
    hidden: bool
    action_kwargs: _t.Dict[_t.Text, _t.Any]
    def __init__(
        self,
        detail: bool = ...,
        methods: _t.Optional[_t.List[_t.Text]] = ...,
        serializer_class: _t.Type[serializers.Serializer] = ...,
        result_serializer_class: _t.Optional[_t.Type[serializers.Serializer]] = ...,
        query_serializer: _t.Optional[_t.Type[serializers.Serializer]] = ...,
        multi: bool = ...,
        title: _t.Optional[_t.Text] = ...,
        icons: _t.Optional[_t.Union[_t.Text, _t.Iterable]] = ...,
        is_list: bool = ...,
        edit_only: bool = ...,
        hidden: bool = ...,
        **kwargs
    ) -> None: ...
    @property
    def is_page(self) -> bool: ...
    def get_extra_path_data(self, method_name: str) -> dict[str, _t.Any]: ...
    def wrap_function(self, func: _t.Callable) -> ViewSetAction: ...
    def __call__(self, method: _t.Callable) -> ViewSetAction:
        def action_method(
            view: viewsets.GenericViewSet,
            request: Request,
            *args,
            **kwargs,
        ) -> _t.Union[Response, FileResponse]:
            ...

        return self.wrap_function(action_method)

class EmptyAction(Action):
    serializer_class: EmptySerializer

    def __init__(
        self,
        detail: bool = ...,
        methods: _t.Optional[_t.List[_t.Text]] = ...,
        result_serializer_class: _t.Optional[_t.Type[serializers.Serializer]] = ...,
        query_serializer: _t.Optional[_t.Type[serializers.Serializer]] = ...,
        multi: bool = ...,
        title: _t.Optional[_t.Text] = ...,
        icons: _t.Optional[_t.Union[_t.Text, _t.Iterable]] = ...,
        is_list: bool = ...,
        hidden: bool = ...,
        **kwargs
    ) -> None: ...

class SimpleAction(Action):
    atomic: bool
    extra_actions: _t.Dict[_t.Text, _t.Callable[..., HttpResponseBase]]
    def __init__(self, atomic: bool = False, *args, **kwargs) -> None: ...
    def _get_transaction_context(self, request, *args, **kwargs) -> _t.ContextManager: ...
    def __call__(self, getter: _t.Optional[_t.Callable] = ...) -> _t.Union['ViewSetAction', 'SimpleActionObject']:  # type: ignore[override]
        action_method = super().__call__(getter)

        def setter(setter_method):
            return self(self.extra_actions.get('get'))

        def deleter(deleter_method):
            return self(self.extra_actions.get('get'))

        return action_method


class SimpleFileAction(Action):
    as_attachment: bool
    extra_actions: dict[_t.Literal['get', 'modified_since', 'pre_data'], _t.Callable]
    cache_control: str

    def __init__(
        self,
        cache_control: str = 'max-age=3600',
        as_attachment: bool = False,
        *args: _t.Any,
        **kwargs: _t.Any
    ) -> None: ...

    def modified_since(
        self,
        obj: _t.Any
    ) -> _t.Optional[datetime]: ...

    def pre_data(
        self,
        obj: _t.Any
    ) -> _t.Tuple[_t.Any, str, str]: ...

    def __call__(  # type: ignore[override]
        self,
        getter: _t.Optional[_t.Callable[[viewsets.ViewSet, HttpRequest, _t.Any], _t.Any]] = None
    ) -> _t.Union['ViewSetAction', 'SimpleFileActionObject']: ...

    def modified_since_method(
        self,
        modified_since: _t.Callable[[HttpRequest, _t.Any], _t.Optional[datetime]]
    ) -> _t.Union['ViewSetAction', 'SimpleFileActionObject']: ...

    def pre_data_method(
        self,
        pre_data: _t.Callable[[_t.Any], _t.Tuple[_t.Any, str, str]]
    ) -> _t.Union['ViewSetAction', 'SimpleFileActionObject']: ...
