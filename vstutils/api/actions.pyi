import typing as _t
from .pagination import SimpleCountedListPagination as SimpleCountedListPagination
from .responses import BaseResponseClass as BaseResponseClass, HTTP_200_OK as HTTP_200_OK, HTTP_201_CREATED as HTTP_201_CREATED, HTTP_204_NO_CONTENT as HTTP_204_NO_CONTENT
from .serializers import DataSerializer as DataSerializer, EmptySerializer as EmptySerializer
from django.http.response import HttpResponseBase, FileResponse
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import serializers, viewsets as viewsets
from rest_framework.decorators import ViewSetAction



class SimpleActionObject(_t.Protocol):
    def setter(self, func: _t.Callable) -> _t.Union[ViewSetAction, 'SimpleActionObject']: ...
    def deleter(self, func: _t.Callable) -> _t.Union[ViewSetAction, 'SimpleActionObject']: ...

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
        hidden: bool = ...,
        **kwargs
    ) -> None: ...
    @property
    def is_page(self) -> bool: ...
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
