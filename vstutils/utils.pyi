import asyncio
import logging
import subprocess
import typing as tp
from .tools import multikeysort as multikeysort
from collections.abc import Generator
from django.core.paginator import Paginator as BasePaginator
from enum import Enum, EnumMeta
from pathlib import Path
from .api.base import GenericViewSet
from .models.base import ModelBaseClass


logger: logging.Logger
ON_POSIX: bool


def deprecated(func: tp.Callable):
    ...


def list_to_choices(items_list: tp.Iterable, response_type: tp.Callable = ...) -> tp.Iterable[tp.Tuple[str, str]]:
    ...


def is_member_descriptor(obj):
    ...


def current_lang(lang: tp.Text | None = ...):
    ...


def get_render(name: tp.Text, data: tp.Dict, trans: tp.Text = ...) -> tp.Text:
    ...


def encode(key, clear):
    ...


def decode(key, enc):
    ...


def get_if_lazy(obj):
    ...


def send_mail(
    subject,
    message,
    from_email,
    recipient_list,
    fail_silently: bool = False,
    auth_user: tp.Any | None = ...,
    auth_password: tp.Any | None = ...,
    connection: tp.Any | None = ...,
    html_message: tp.Any | None = ...,
    **kwargs):
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


def send_template_email(sync: bool = False, **kwargs):
    ...


def patch_gzip_response(response, request):
    ...


def patch_gzip_response_decorator(func):
    ...


def translate(text: tp.Text) -> tp.Text:
    ...


def lazy_translate(text: tp.Text) -> str:
    ...


def create_view(model: ModelBaseClass, **meta_options) -> type[GenericViewSet]:
    ...


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

    def __call__(self, original_function: tp.Callable):
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
    def get_django_settings(cls, name: tp.Text, default: tp.Any = ...):
        ...

    @classmethod
    def get_django_cache(cls, cache_name: tp.Text = ...):
        ...


class SecurePickling(BaseVstObject):
    secure_key: tp.Any

    def __init__(self, secure_key: tp.Optional[tp.Text] = ...) -> None:
        ...

    def loads(self, value: tp.Any):
        ...

    def dumps(self, value: tp.Any):
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

    def PREFIX(cls):
        ...

    def cache(cls):
        ...

    def __init__(self, key, timeout: tp.Any | None = ...) -> None:
        ...

    def send(self, value, ttl: tp.Any | None = ...):
        ...

    def prolong(self, ttl: tp.Any | None = ...) -> None:
        ...

    def get(self):
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

    def PREFIX(cls):
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

    def __enter__(self):
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

    def __call__(self, original_function):
        ...


class model_lock_decorator(__LockAbstractDecorator):
    def execute(self, func, *args, **kwargs):
        ...


class Paginator(BasePaginator):
    def __init__(self, qs, chunk_size: tp.Any | None = ...) -> None:
        ...

    def __iter__(self):
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
    def objects(self):
        ...

    def __len__(self) -> int:
        ...

    def __iter__(self):
        ...

    def __getitem__(self, name: tp.Text) -> tp.Any:
        ...

    def __call__(self, name, obj):
        ...

    def __dict__(self):
        ...

    def keys(self) -> tp.Iterable[tp.Text]:
        ...

    def values(self) -> tp.Iterable:
        ...

    def items(self):
        ...

    def list(self) -> tp.Dict[tp.Text, tp.Dict[tp.Text, tp.Any]]:
        ...

    def get_backend_data(self, name: tp.Text):
        ...

    def get_backend_handler_path(self, name: tp.Text):
        ...

    def backend(self, name: tp.Text):
        ...

    def opts(self, name: tp.Text):
        ...

    def get_object(self, name: tp.Text, *args, **kwargs):
        ...


class StaticFilesHandlers(ObjectHandlers):
    def opts(self, name):
        ...

    def get_static_objects(self) -> Generator[tp.Any, None, None]:
        ...

    def get_sorted_list(self):
        ...


class ModelHandlers(ObjectHandlers):
    def get_object(self, name: tp.Text, obj) -> tp.Any:  # type: ignore
        ...


class URLHandlers(ObjectHandlers):
    settings_urls: tp.ClassVar[tp.List[tp.Text]]
    additional_handlers: tp.List[tp.Text]
    default_namespace: tp.Any
    __handlers__: tp.Any

    def __init__(self, type_name: tp.Text = ..., *args, **kwargs) -> None:
        ...

    @property
    def view_handlers(self):
        ...

    def get_backend_data(self, name: tp.Text):
        ...

    def get_object(self, name: tp.Text, *argv, **kwargs):
        ...

    def urls(self) -> tp.Iterable:
        ...

    def __iter__(self):
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
    def get_names(cls):
        ...

    @classmethod
    def to_choices(cls):
        ...

    def is_equal(self, cmp_str):
        ...

    def not_equal(self, cmp_str):
        ...
