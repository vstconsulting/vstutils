import typing as _t
import logging
from .api.models import Language as Language
from .utils import BaseVstObject as BaseVstObject
from .models.cent_notify import Notificator
from contextlib import contextmanager
from django.http.request import HttpRequest
from django.http.response import HttpResponse

logger: logging.Logger
ResponseType = _t.TypeVar('ResponseType', bound=HttpResponse)
ResponseHandlerType = _t.Union[_t.Awaitable[ResponseType], ResponseType]
GetResponseCallable = _t.Callable[[HttpRequest], ResponseType]


@contextmanager
def wrap_connections(wrapper) -> _t.ContextManager: ...

class QueryTimingLogger:
    queries_time: int
    def __init__(self) -> None: ...
    def __call__(self, execute, sql, params, many, context): ...

class BaseMiddleware(BaseVstObject):
    logger: logging.Logger
    get_response: GetResponseCallable
    def __init__(self, get_response: GetResponseCallable) -> None: ...
    def get_setting(self, value: _t.Text): ...
    def handler(self, request: HttpRequest, response: HttpResponse) -> HttpResponse: ...
    def request_handler(self, request: HttpRequest) -> HttpRequest: ...
    def get_response_handler(self, request: HttpRequest) -> ResponseHandlerType: ...
    def __call__(self, request: HttpRequest) -> ResponseHandlerType: ...


class AsyncBaseMiddleware(BaseVstObject):
    logger: logging.Logger
    get_response: GetResponseCallable

    def __init__(self, get_response: GetResponseCallable) -> None: ...
    def get_setting(self, value: _t.Text): ...
    async def handler(self, request: HttpRequest, response: HttpResponse) -> HttpResponse: ...
    async def request_handler(self, request: HttpRequest) -> HttpRequest: ...
    async def get_response_handler(self, request: HttpRequest) -> ResponseHandlerType: ...
    async def __call__(self, request: HttpRequest) -> ResponseHandlerType: ...

class TimezoneHeadersMiddleware(BaseMiddleware):
    def handler(self, request: HttpRequest, response: HttpResponse) -> HttpResponse: ...

class ExecuteTimeHeadersMiddleware(BaseMiddleware):
    def __duration_handler(self, data): ...
    def _round_time(self, seconds: _t.Union[int, float]): ...
    def get_response_handler(self, request: HttpRequest) -> ResponseHandlerType: ...

class LangMiddleware(BaseMiddleware):
    def get_lang_object(self, request: HttpRequest) -> _t.Tuple[Language, bool]: ...
    def get_response_handler(self, request: HttpRequest) -> ResponseHandlerType: ...


class FrontendChangesNotifications(BaseMiddleware):
    notificator: Notificator
    def __init__(self, *args, **kwargs) -> None: ...
    def request_handler(self, request: HttpRequest) -> HttpRequest: ...
    def handler(self, request: HttpRequest, response: HttpResponse) -> HttpResponse: ...
