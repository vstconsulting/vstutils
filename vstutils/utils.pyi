import asyncio
import logging
import subprocess
import typing as tp
from .tools import multikeysort as multikeysort
from collections.abc import Generator
from django.http.response import HttpResponse
from django.http.request import HttpRequest
from django.utils.functional import LazyObject
from django.core.paginator import Paginator as BasePaginator, Page
from django.core.cache.backends.base import BaseCache
from django.urls.resolvers import URLResolver, URLPattern
from rest_framework import request as drf_request
from enum import Enum, EnumMeta
from pathlib import Path
from .api.models import Language
from .models.base import ModelBaseClass

T = tp.TypeVar('T')
TCallable = tp.TypeVar('TCallable', bound=tp.Callable)
Request = HttpRequest | drf_request.Request
Response = HttpResponse

logger: logging.Logger
ON_POSIX: bool


def deprecated(func: TCallable) -> TCallable:
    ...


def list_to_choices(items_list: tp.Iterable, response_type: tp.Callable = ...) -> tp.Iterable[tp.Tuple[str, str]]:
    ...


def is_member_descriptor(obj: tp.Any) -> bool:
    ...


def current_lang(lang: tp.Text | None = ...) -> Language:
    ...


def get_render(name: tp.Text, data: tp.Dict, trans: tp.Text = ...) -> tp.Text:
    ...


def encode(key: str, clear: str) -> str:
    ...


def decode(key: str, enc: str) -> str:
    ...


def get_if_lazy(obj: T | LazyObject) -> T:
    ...


def send_mail(
    subject: tp.Any,
    message: tp.Any,
    from_email: str | None,
    recipient_list: tp.Sequence[str] | None,
    fail_silently: bool = False,
    auth_user: tp.Any | None = ...,
    auth_password: tp.Any | None = ...,
    connection: tp.Any | None = ...,
    html_message: tp.Any | None = ...,
    **kwargs) -> int:
    ...


def send_template_email_handler(
    subject: tp.Text,
    email_from: tp.Text,
    email: tp.Union[tp.List, tp.Text],
    template_name: tp.Text,
    context_data: tp.Optional[tp.Dict] = ...,
    **kwargs
) -> tp.SupportsInt:
    ...


def send_template_email(sync: bool = False, **kwargs) -> None:
    ...


def patch_gzip_response(response: HttpResponse | T, request: Request) -> T:
    ...


def patch_gzip_response_decorator(func: TCallable) -> TCallable:
    ...


def translate(text: tp.Text) -> tp.Text:
    ...


def lazy_translate(text: tp.Text) -> str:
    ...


def create_view(model: ModelBaseClass, **meta_options):
    return model.get_view_class(**meta_options)


class apply_decorators:
    decorators: tp.Any

    def __init__(self, *decorators) -> None:
        ...

    def __call__(self, func):
        ...


class ClassPropertyMeta(type):
    def __setattr__(cls, key, value):
        ...


class ClassPropertyDescriptor:
    meta = ClassPropertyMeta
    fset: tp.Any

    def __init__(self, fget: tp.Callable, fset: tp.Optional[tp.Callable] = ...) -> None:
        ...

    def __get__(self, obj, klass: tp.Type | None = ...):
        ...

    def __set__(self, obj: tp.Any, value: tp.Any):
        ...

    def setter(self, func: tp.Union[tp.Callable, classmethod]):
        ...


class classproperty(ClassPropertyDescriptor):
    ...


class redirect_stdany:
    streams: tp.Any
    stream: tp.Any

    def __init__(self, new_stream=..., streams: tp.Any | None = ...) -> None:
        ...

    def __enter__(self):
        ...

    def __exit__(self, exctype, excinst, exctb) -> None:
        ...


class Dict(dict):
    ...


class tmp_file:
    fd: tp.Any
    path: tp.Any

    def __init__(self, data: tp.Text = ..., mode: tp.Text = ..., bufsize: int = ..., **kwargs) -> None:
        ...

    def write(self, wr_string: tp.Text):
        ...

    def __getattr__(self, name: tp.Text):
        ...

    def __del__(self) -> None:
        ...

    def __enter__(self):
        ...

    def __exit__(self, type_e, value, tb) -> None:
        ...


class tmp_file_context:
    tmp: tp.Any

    def __init__(self, *args, **kwargs) -> None:
        ...

    def __enter__(self):
        ...

    def __exit__(self, type_e, value, tb) -> None:
        ...


class assertRaises:
    def __init__(self, *args, **kwargs) -> None:
        ...

    def mark_as_failed(self) -> None:
        ...

    def cleanup_fails(self) -> None:
        ...

    @property
    def is_failed(self):
        ...

    def __enter__(self):
        ...

    def __exit__(self, exc_type, exc_val, exc_tb):
        ...


class raise_context(assertRaises):
    def execute(self, func: tp.Callable, *args, **kwargs):
        ...

    def __enter__(self):
        ...

    def __call__(self, original_function: TCallable) -> TCallable:
        ...


class raise_context_decorator_with_default(raise_context):
    default_value: tp.Any

    def __init__(self, *args, **kwargs) -> None:
        ...

    def execute(self, func: tp.Callable, *args, **kwargs):
        ...


class exception_with_traceback(raise_context):
    def __init__(self, *args, **kwargs) -> None:
        ...

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        ...


class BaseVstObject:
    @classmethod
    def get_django_settings(cls, name: tp.Text, default: tp.Any = ...) -> tp.Any:
        ...

    @classmethod
    def get_django_cache(cls, cache_name: tp.Text = ...) -> BaseCache:
        ...


class SecurePickling(BaseVstObject):
    secure_key: tp.Any

    def __init__(self, secure_key: tp.Optional[tp.Text] = ...) -> None:
        ...

    def loads(self, value: tp.Any) -> tp.Any:
        ...

    def dumps(self, value: tp.Any) -> str:
        ...


class Executor(BaseVstObject):
    CANCEL_PREFIX: tp.ClassVar[tp.Text]
    STDOUT: tp.ClassVar[int]
    STDERR: tp.ClassVar[int]
    DEVNULL: tp.ClassVar[int]
    CalledProcessError: tp.ClassVar[tp.Type[subprocess.CalledProcessError]]
    env: tp.Dict[str, str]
    output: str
    __stdout__: tp.Any
    __stderr__: tp.Any

    def __init__(
        self,
        stdout: tp.Union[tp.BinaryIO, int] = ...,
        stderr: tp.Union[tp.BinaryIO, int] = ...,
        **environ_variables: str,
    ) -> None:
        ...

    def write_output(self, line: tp.Text) -> None:
        ...

    async def working_handler(self, proc: asyncio.subprocess.Process):
        ...

    async def line_handler(self, line: tp.Text) -> None:
        ...

    async def pre_execute(self, cmd: tp.Iterable[tp.Text], cwd: tp.Union[tp.Text, Path], env: dict):
        ...

    async def post_execute(
        self,
        cmd: tp.Iterable[tp.Text],
        cwd: tp.Union[tp.Text, Path],
        env: dict,
        return_code: int
    ):
        ...

    async def aexecute(self, cmd: tp.Iterable[tp.Text], cwd: tp.Union[tp.Text, Path], env: dict = ...) -> tp.Text:
        ...

    def execute(self, cmd: tp.Iterable[tp.Text], cwd: tp.Union[tp.Text, Path], env: dict = ...) -> tp.Text:
        ...


class UnhandledExecutor(Executor):
    working_handler: tp.Any


class KVExchanger(BaseVstObject):
    TIMEOUT: tp.ClassVar[int]
    __djangocache__: tp.Any
    key: tp.Any
    timeout: tp.Any
    PREFIX: tp.ClassVar[tp.Text]
    cache: tp.ClassVar[BaseCache]

    def __init__(self, key, timeout: tp.Any | None = ...) -> None:
        ...

    def send(self, value, ttl: tp.Any | None = ...) -> bool:
        ...

    def prolong(self, ttl: tp.Any | None = ...) -> None:
        ...

    def get(self) -> tp.Any:
        ...

    def delete(self) -> None:
        ...


class Lock(KVExchanger):
    TIMEOUT: tp.ClassVar[int]
    GLOBAL: tp.ClassVar[tp.Text]
    SCHEDULER: tp.ClassVar[tp.Text]
    payload_data: tp.Any
    id: tp.Any

    class AcquireLockException(Exception):
        ...

    def __init__(
        self,
        id,
        payload: int = ...,
        repeat: int = ...,
        err_msg: str = ...,
        timeout: tp.Any | None = ...,
    ) -> None:
        ...

    def get(self):
        ...

    def __enter__(self) -> 'Lock':
        ...

    def __exit__(self, type_e, value, tb) -> None:
        ...

    def release(self, force_release: bool = False) -> None:
        ...

    def __del__(self) -> None:
        ...


class __LockAbstractDecorator:
    kwargs: tp.Any

    def __init__(self, **kwargs) -> None:
        ...

    def execute(self, func, *args, **kwargs):
        ...

    def __call__(self, original_function: TCallable) -> TCallable:
        ...


class model_lock_decorator(__LockAbstractDecorator):
    def execute(self, func, *args, **kwargs):
        ...


class Paginator(BasePaginator):
    def __init__(self, qs, chunk_size: tp.Any | None = ...) -> None:
        ...

    def __iter__(self) -> tp.Generator[Page, None, None]:
        ...

    def items(self) -> Generator[tp.Any, None, None]:
        ...


class ObjectHandlers(BaseVstObject):
    type: tp.Text
    err_message: tp.Optional[tp.Text]
    __list__: tp.Any
    __loaded_backends__: tp.Any

    def __init__(self, type_name: tp.Text, err_message: tp.Optional[tp.Text] = ...) -> None:
        ...

    @property
    def objects(self) -> tp.Dict[str, tp.Type]:
        ...

    def __len__(self) -> int:
        ...

    def __iter__(self) -> tp.Iterable[tp.Tuple[str, tp.Type]]:
        ...

    def __getitem__(self, name: tp.Text) -> tp.Type:
        ...

    def __call__(self, name, obj) -> tp.Any:
        ...

    def __dict__(self):
        ...

    def keys(self) -> tp.Iterable[tp.Text]:
        ...

    def values(self) -> tp.Iterable[tp.Type]:
        ...

    def items(self) -> tp.Iterable[tp.Tuple[str, tp.Type]]:
        ...

    def list(self) -> tp.Dict[tp.Text, tp.Dict[tp.Text, tp.Any]]:
        ...

    def get_backend_data(self, name: tp.Text) -> tp.Dict[str, tp.Any]:
        ...

    def get_backend_handler_path(self, name: tp.Text):
        ...

    def backend(self, name: tp.Text) -> tp.Type:
        ...

    def opts(self, name: tp.Text) -> tp.Dict[str, tp.Any]:
        ...

    def get_object(self, name: tp.Text, *args, **kwargs) -> tp.Any:
        ...


class StaticFilesHandlers(ObjectHandlers):
    def get_static_objects(self) -> Generator[tp.Any, None, None]:
        ...

    def get_sorted_list(self) -> tp.Tuple:
        ...


class ModelHandlers(ObjectHandlers):
    def get_object(self, name: tp.Text, obj) -> tp.Any:  # type: ignore[override]
        ...


class URLHandlers(ObjectHandlers):
    settings_urls: tp.ClassVar[tp.List[tp.Text]]
    additional_handlers: tp.List[tp.Text]
    default_namespace: tp.Any
    __handlers__: tp.Any

    def __init__(self, type_name: tp.Text = ..., *args, **kwargs) -> None:
        ...

    @property
    def view_handlers(self) -> tp.Sequence['URLHandlers']:
        ...

    def urls(self) -> tp.Generator[URLResolver | URLPattern, None, None]:
        ...

    def __iter__(self) -> tp.Generator[URLResolver | URLPattern, None, None]:  # type: ignore[override]
        ...


class VstEnumMeta(EnumMeta):
    LOWER: object
    UPPER: object
    SAME: object

    def __new__(metacls, cls, bases, classdict):
        ...


class VstEnum(Enum, metaclass=VstEnumMeta):
    ...


class BaseEnum(str, VstEnum):
    def __new__(cls, name):
        ...

    def __hash__(self):
        ...

    @classmethod
    def get_names(cls) -> tp.Iterable[tp.Text]:
        ...

    @classmethod
    def to_choices(cls) -> tp.Iterable[tp.Tuple[tp.Text, tp.Text]]:
        ...

    def is_equal(self, cmp_str) -> bool:
        ...

    def not_equal(self, cmp_str) -> bool:
        ...
