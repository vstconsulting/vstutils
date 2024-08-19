# pylint: disable=django-not-available,invalid-name,import-outside-toplevel,too-many-lines
import base64
import codecs
import io
import logging
import os
import pickle
import random
import subprocess
import asyncio
import sys
import tempfile
import time
import json
import traceback
import types
import typing as tp
import uuid
import warnings
from functools import lru_cache, wraps
from pathlib import Path
from enum import Enum, EnumMeta
from importlib import import_module

from asgiref.sync import sync_to_async, async_to_sync
from django.conf import settings
from django.middleware.gzip import GZipMiddleware
from django.urls import re_path, path, include
from django.core.mail import get_connection, EmailMultiAlternatives
from django.core.cache import caches, InvalidCacheBackendError
from django.core.paginator import Paginator as BasePaginator
from django.core.exceptions import ImproperlyConfigured
from django.template import loader
from django.utils import translation, functional
from django.utils.cache import cc_delim_re
from django.utils.translation import get_language
from django.utils.module_loading import import_string
from django.views.decorators.csrf import csrf_exempt
from django.views.generic.base import View

from . import exceptions as ex

if tp.TYPE_CHECKING:  # nocv
    from django.contrib.sessions.backends.base import SessionBase


logger: logging.Logger = logging.getLogger('vstutils')
ON_POSIX = 'posix' in sys.builtin_module_names
_gzip_object = GZipMiddleware(lambda *args, **kwargs: None)  # type: ignore


def deprecated(func):
    """
    This is a decorator which can be used to mark functions
    as deprecated. It will result in a warning being emitted
    when the function is used.

    :param func: any callable that will be wrapped and will issue a deprecation warning when called.
    """

    def new_func(*args, **kwargs):
        warnings.warn(f'Call to deprecated function {func.__name__}.',
                      category=DeprecationWarning,
                      stacklevel=2)
        return func(*args, **kwargs)

    return new_func


def raise_misconfiguration(ok, message=None):
    """
    Helper function that raises an `ImproperlyConfigured` exception if a condition is not met.

    This function acts as a replacement for the `assert` statement, providing clearer error handling
    in cases where the application configuration is incorrect.

    :param ok:
        A value of any type that can be evaluated as a boolean. If the boolean evaluation returns False,
        the exception will be raised.
    :type ok: Any

    :param message:
        An optional message to include in the exception.
        If not provided, the exception will be raised without a message.
    :type message: str, optional

    :raises ImproperlyConfigured:
        Raised if the boolean evaluation of the `ok` parameter is False,
        indicating a misconfiguration in the application.

    :return:
        This function does not return any value. It either passes silently or raises an exception.
    :rtype: None
    """
    if not ok:
        raise ImproperlyConfigured(message)


def list_to_choices(items_list, response_type=list):
    """
    Method to create django model choices from flat list of values.

    :param items_list: list of flat values.
    :param response_type: casting type of returned mapping
    :return: list of tuples from `items_list` values
    """
    return response_type(((x, x) for x in items_list))


def is_member_descriptor(obj):
    try:
        return type(obj).__name__ == 'member_descriptor'
    except:  # nocv
        return False


@lru_cache()
def current_lang(lang=None):
    from vstutils.api.models import Language
    try:
        return Language.objects.get(code=lang or get_language())
    except Exception:  # nocv
        return Language.objects.all().first()


def get_render(name, data, trans='en'):
    """
    Render string from template.

    :param name: -- full template name
    :type name: str
    :param data: -- dict of rendered vars
    :type data: dict
    :param trans: -- translation for render. Default 'en'.
    :type trans: str
    :return: -- rendered string
    :rtype: str
    """
    cur_language: str = translation.get_language()
    try:
        if trans != cur_language:
            translation.activate(trans)
        config = loader.get_template(name)
        result = config.render(data, data.pop('request', None)).replace('\r', '')
    finally:
        if trans != cur_language:
            translation.activate(cur_language)
    return result


def encode(key, clear):
    """
    Encode string by Vigenère cipher.

    :param key: -- secret key for encoding
    :type key: str
    :param clear: -- clear value for encoding
    :type clear: str
    :return: -- encoded string
    :rtype: str
    """
    # pylint: disable=consider-using-enumerate

    enc = []
    for i in range(len(clear)):
        key_c = key[i % len(key)]
        enc.append(chr((ord(clear[i]) + ord(key_c)) % 256))
    return base64.urlsafe_b64encode("".join(enc).encode()).decode()


def decode(key, enc):
    """
    Decode string from encoded by Vigenère cipher.

    :param key: -- secret key for encoding
    :type key: str
    :param enc: -- encoded string for decoding
    :type enc: str
    :return: -- decoded string
    :rtype: str
    """
    # pylint: disable=consider-using-enumerate

    dec = []
    enc = base64.urlsafe_b64decode(enc).decode()
    for i in range(len(enc)):
        key_c = key[i % len(key)]
        dec.append(chr((256 + ord(enc[i]) - ord(key_c)) % 256))
    return "".join(dec)


def get_if_lazy(obj):
    with raise_context():
        if isinstance(obj, functional.LazyObject):
            # pylint: disable=protected-access
            obj._setup() if obj._wrapped == functional.empty else None
            return obj._wrapped
    return obj


def send_mail(subject, message, from_email, recipient_list,  # noqa: CFQ002
              fail_silently=False, auth_user=None, auth_password=None,
              connection=None, html_message=None, **kwargs):
    """
    Wrapper over :func:`django.core.mail.send_mail` which provide additional named arguments.
    """
    # pylint: disable=too-many-arguments
    connection = connection or get_connection(
        username=auth_user,
        password=auth_password,
        fail_silently=fail_silently,
    )
    mail = EmailMultiAlternatives(
        subject,
        message,
        from_email,
        recipient_list,
        connection=connection,
        **kwargs,
    )
    if html_message:
        mail.attach_alternative(html_message, 'text/html')

    return mail.send()


def send_template_email_handler(
        subject,
        email_from,
        email,
        template_name,
        context_data=None,
        **kwargs,
):
    """
    Function for email sending.
    The function convert recipient to list and set context before sending if it possible.

    :param subject: mail subject.
    :param email_from: sender that be setup in email.
    :param email: list of strings or single string, with email addresses of recipients
    :param template_name: relative path to template in `templates` directory, must include extension in file name.
    :param context_data: dictionary with context for rendering message template.
    :param kwargs: additional named arguments for `send_mail`
    :return: Number of emails sent.
    """
    recipient_list = email if isinstance(email, (list, tuple)) else [email]

    if context_data is None:
        context = {}
    elif not isinstance(context_data, dict):
        context = dict(context_data)
    else:
        context = context_data.copy()

    return send_mail(
        subject=subject,
        message="",
        from_email=email_from,
        recipient_list=recipient_list,
        html_message=loader.render_to_string(
            template_name,
            context=context,
            request=context.pop('request', None)
        ),
        **kwargs
    )


def send_template_email(sync=False, **kwargs):
    """
    Function executing sync or async email sending; according `sync` argument and settings variable "RPC_ENABLED".
    If you don't set settings for celery or don't have celery it sends synchronously mail.
    If celery is installed and configured and `sync` argument of the function is set to `False`,
    it sends asynchronously email.

    :param sync: argument for determining how send email, asynchronously or synchronously
    :param subject: mail subject.
    :param email: list of strings or single string, with email addresses of recipients
    :param template_name: relative path to template in `templates` directory, must include extension in file name.
    :param context_data: dictionary with context for rendering message template.
    """
    if sync or not settings.RPC_ENABLED:
        send_template_email_handler(email_from=settings.EMAIL_FROM_ADDRESS, **kwargs)
    else:
        from .tasks import SendEmailMessage
        SendEmailMessage.do(email_from=settings.EMAIL_FROM_ADDRESS, **kwargs)


def patch_gzip_response(response, request):
    if not response.status_code == 200:
        return  # nocv
    GZipMiddleware.process_response(_gzip_object, request, response)
    return response


def patch_gzip_response_decorator(func):
    def gzip_response_wrapper(view, request, *args, **kwargs):
        response = func(view, request, *args, **kwargs)
        with raise_context():
            patch_gzip_response(response, request)
        return response

    return gzip_response_wrapper


def translate(text):
    """
    The ``translate`` function supports translation message dynamically
    with standard i18n vstutils'es mechanisms usage.

    Uses :func:`django.utils.translation.get_language` to get the language code and
    tries to get the translation from the list of available ones.

    :param text: Text message which should be translated.
    """
    try:
        return current_lang(lang=get_language()).translate(text)
    except Exception:  # nocv
        return text


def lazy_translate(text):
    """
    The ``lazy_translate`` function has the same behavior as :func:`.translate`, but wraps it in a lazy promise.

    This is very useful, for example, for translating error messages in
    class attributes before the language code is known.

    :param text: Text message which should be translated.
    """
    return functional.lazy(translate, str)(text)


def create_view(model, **meta_options):
    """
    A simple function for getting the generated view by standard means, but with overloaded meta-parameters.
    This method can completely get rid of the creation of proxy models.

    Example:
        .. sourcecode:: python

            from vstutils.utils import create_view

            from .models import Host

            # Host model has full :class:`vstutils.api.base.ModelViewSet` view.
            # For overriding and create simple list view just setup this:
            HostListViewSet = create_view(
                HostList,
                view_class='list_only'
            )


    .. note::
        This method is also recommended in cases where there is a problem of recursive imports.

    .. warning::
        This function is oldstyle and will be deprecated in future versions.
        Use native call of method :meth:`vstutils.models.BModel.get_view_class`.

    :type model: Type[vstutils.models.BaseModel]
    :param model: Model class with `.get_view_class` method. This method also has :class:`vstutils.models.BModel`.
    :rtype: vstutils.api.base.GenericViewSet
    """
    return model.get_view_class(**meta_options)


class apply_decorators:
    """
    Decorator which apply list of decorators on method or class.

    Example:
        .. sourcecode:: python

            from vstutils.utils import apply_decorators

            def decorator_one(func):
                print(f"Decorated {func.__name__} by first decorator.")
                return func

            def decorator_two(func):
                print(f"Decorated {func.__name__} by second decorator.")
                return func

            @apply_decorators(decorator_one, decorator_two)
            def decorated_function():
                # Function decorated by both decorators.
                print("Function call.")
    """

    __slots__ = ('decorators',)

    def __init__(self, *decorators):
        self.decorators = decorators

    def __call__(self, func):
        for decorator in self.decorators:
            func = decorator(func)
        return func


class ClassPropertyMeta(type):
    def __setattr__(cls, key, value):
        obj = cls.__dict__.get(key, None)
        if isinstance(obj, ClassPropertyDescriptor):
            return obj.__set__(cls, value)
        return super().__setattr__(key, value)


class ClassPropertyDescriptor:
    __slots__ = ('fget', 'fset')

    meta = ClassPropertyMeta

    def __init__(self, fget, fset=None):
        self.fget, self.fset = self._fix_function(fget), self._fix_function(fset)

    def __get__(self, obj, klass=None):
        if obj is not None:
            return self.fget.__get__(obj, obj)()
        return self.fget.__get__(obj, type(obj) if klass is None else klass)()

    def __set__(self, obj, value):
        if not self.fset:
            raise AttributeError("can't set attribute")
        if obj is not None:
            return self.fset.__get__(obj, obj)(value)
        return self.fset.__get__(obj, type(obj))(value)  # nocv

    def setter(self, func):
        self.fset = self._fix_function(func)
        return self

    @classmethod
    def _fix_function(cls, func):
        if func is None:
            return func
        if not isinstance(func, (classmethod, staticmethod)):
            func = classmethod(func)
        return func


class classproperty(ClassPropertyDescriptor):
    """
    Decorator which makes class method as class property.

    Example:
        .. sourcecode:: python

            from vstutils.utils import classproperty

            class SomeClass(metaclass=classproperty.meta):
                # Metaclass is needed for set attrs in class
                # instead of and not only object.

                some_value = None

                @classproperty
                def value(cls):
                    return cls.some_value

                @value.setter
                def value(cls, new_value):
                    cls.some_value = new_value

    :param fget: function for getting an attribute value.
    :param fset: function for setting an attribute value.
    """


class redirect_stdany:
    """
    Context for redirect any output to own stream.

    .. note::
        - On context returns stream object.
        - On exit returns old streams.
    """
    __slots__ = ('stream', 'streams', '_old_streams')

    _streams = ["stdout", "stderr"]

    def __init__(self, new_stream=io.StringIO(), streams=None):
        """
        :param new_stream: -- stream where redirects all
        :type new_stream: object
        :param streams: -- names of streams like ``['stdout', 'stderr']``
        :type streams: list
        """
        self.streams = streams or self._streams
        self.stream = new_stream
        self._old_streams = {}

    def __enter__(self):
        for stream in self.streams:
            self._old_streams[stream] = getattr(sys, stream)
            setattr(sys, stream, self.stream)
        return self.stream

    def __exit__(self, exctype, excinst, exctb):
        for stream in self.streams:
            setattr(sys, stream, self._old_streams.pop(stream))


class Dict(dict):
    """
    Wrapper over `dict` which
    return JSON on conversion to string.
    """

    def __repr__(self):  # nocv
        return self.__str__()

    def __str__(self):
        return json.dumps(self.copy())


class tmp_file:
    """
    Temporary file with name
    generated and auto removed on close.

    **Attributes**:

    :param data: -- string to write in tmp file.
    :type data: str
    :param mode: -- file open mode. Default 'w'.
    :type mode: str
    :param bufsize: -- buffer size for tempfile.NamedTemporaryFile
    :type bufsize: int
    :param kwargs:  -- other kwargs for tempfile.NamedTemporaryFile

    """
    __slots__ = ('fd', 'path')

    def __init__(self, data="", mode="w", bufsize=-1, **kwargs):
        # pylint: disable=consider-using-with
        self.fd = tempfile.NamedTemporaryFile(mode, buffering=bufsize, **kwargs)
        self.path = Path(self.fd.name)
        if data:
            self.write(data)

    def write(self, wr_string):
        """
        Write to file and flush

        :param wr_string: -- writable string
        :type wr_string: str
        :return: None
        :rtype: None
        """
        result = self.fd.write(wr_string)
        self.fd.flush()
        return result

    def __getattr__(self, name):
        return getattr(self.fd, name)

    def __del__(self):
        with raise_context():
            self.fd.close()

    def __enter__(self):
        """
        :return: -- file object
        :rtype: tempfile.NamedTemporaryFile
        """
        return self

    def __exit__(self, type_e, value, tb):
        self.fd.close()


class tmp_file_context:
    """
    Context object for work with tmp_file.
    Auto close on exit from context and
    remove if file still exist.

    This context manager over :class:`.tmp_file`
    """
    __slots__ = ('tmp',)

    def __init__(self, *args, **kwargs):
        self.tmp: tempfile.NamedTemporaryFile = tmp_file(*args, **kwargs)

    def __enter__(self):
        return self.tmp

    def __exit__(self, type_e, value, tb):
        self.tmp.close()
        if self.tmp.path.exists():
            self.tmp.path.unlink()


class assertRaises:
    __slots__ = ('_kwargs', '_verbose', '_exclude', '_excepts', '_log', '__failed')

    def __init__(self, *args, **kwargs):
        """
        :param args: -- list of exception classes should be passed
        :type args: list,Exception
        :param exclude: -- list of exception classes should be raised
        :type exclude: list,Exception
        :param verbose: -- logging
        :type verbose: bool
        """
        self._kwargs = {**kwargs}
        self._verbose = kwargs.pop("verbose", settings.DEBUG)
        self._exclude = kwargs.pop("exclude", False)
        self._excepts = tuple(args)
        self.__failed = False

    def mark_as_failed(self):
        self.__failed = True

    def cleanup_fails(self):
        self.__failed = False

    @property
    def is_failed(self):
        return self.__failed

    def __enter__(self):
        return self  # pragma: no cover

    def __exit__(self, exc_type, exc_val, exc_tb):
        return exc_type is not None and (
                (not self._exclude and not issubclass(exc_type, self._excepts)) or
                (self._exclude and issubclass(exc_type, self._excepts))
        )


# noinspection PyUnreachableCode
class raise_context(assertRaises):
    """
    Context for exclude exceptions.
    """

    __slots__ = ()

    def execute(self, func, *args, **kwargs):
        self.cleanup_fails()
        with self.__class__(self._excepts, **self._kwargs):
            try:
                return func(*args, **kwargs)
            except:
                self.mark_as_failed()
                type, value, traceback_obj = sys.exc_info()
                if self._verbose:
                    logger.debug(traceback.format_exc())
                raise
        return type, value, traceback_obj

    def __enter__(self):
        return self.execute

    def __call__(self, original_function):
        def wrapper(*args, **kwargs):
            return self.execute(original_function, *args, **kwargs)
        return wrapper


class raise_context_decorator_with_default(raise_context):
    """
    Context for exclude errors and return default value.

    Example:
        .. sourcecode:: python

            from yaml import load
            from vstutils.utils import raise_context_decorator_with_default


            @raise_context_decorator_with_default(default={})
            def get_host_data(yaml_path, host):
                with open(yaml_path, 'r') as fd:
                    data = load(fd.read(), Loader=Loader)
                return data[host]
                # This decorator used when you must return some value even on error
                # In log you also can see traceback for error if it occur

            def clone_host_data(host):
                bs_data = get_host_data('inventories/aws/hosts.yml', 'build_server')
                ...

    """
    __slots__ = ('default_value',)

    def __init__(self, *args, **kwargs):
        self.default_value = kwargs.pop('default', None)
        super().__init__(*args, **kwargs)

    def execute(self, func, *args, **kwargs):
        result = super().execute(func, *args, **kwargs)
        if self.is_failed:
            return self.default_value
        return result


class exception_with_traceback(raise_context):
    __slots__ = ()

    def __init__(self, *args, **kwargs):
        super().__init__(**kwargs)

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_val is not None:
            exc_val.traceback = traceback.format_exc()
            raise exc_val.with_traceback(exc_tb)


class BaseVstObject:
    """
    Default mixin-class for custom objects which needed to get settings and cache.
    """
    __slots__ = ()

    @classmethod
    def get_django_settings(cls, name, default=None):
        # pylint: disable=access-member-before-definition
        """
        Get params from Django settings.

        :param name: name of param
        :type name: str
        :param default: default value of param
        :type default: object
        :return: Param from Django settings or default.
        """
        return getattr(settings, name, default)

    @classmethod
    def get_django_cache(cls, cache_name='default'):
        try:
            return caches[cache_name]
        except InvalidCacheBackendError:  # nocv
            return caches['default']


class SecurePickling(BaseVstObject):
    """
    Secured pickle wrapper by Vigenère cipher.


    .. warning::
        Do not use it with untrusted transport anyway.

    Example:
        .. sourcecode:: python

            from vstutils.utils import SecurePickling


            serializer = SecurePickling('password')

            # Init secret object
            a = {"key": "value"}
            # Serialize object with secret key
            pickled = serializer.dumps(a)
            # Deserialize object
            unpickled = serializer.loads(pickled)

            # Check, that object is correct
            assert a == unpickled

    """
    __slots__ = ('secure_key',)

    def __init__(self, secure_key=None):
        """
        :param secure_key: Secret key for encoding.
        """
        if secure_key is None:
            secure_key = self.get_django_settings('SECRET_KEY')
        self.secure_key = str(secure_key)

    def _encode(self, value):
        return encode(self.secure_key, value)

    def _decode(self, value):
        return decode(self.secure_key, value)

    def loads(self, value):
        return pickle.loads(codecs.decode(self._decode(value).encode(), "base64"))  # nosec

    def dumps(self, value):
        return self._encode(codecs.encode(pickle.dumps(value), "base64").decode())


class Executor(BaseVstObject):
    """
    Command executor with realtime output write and line handling.
    By default and by design executor initialize string attribute ``output``
    which will be modified by ``+=`` operator with new lines by :meth:`.Executor.write_output`
    procedure. Override the method if you want change behavior.

    Executor class supports periodically (0.01 sec) handling process and execute some checks
    by overriding :meth:`.Executor.working_handler` procedure method. If you want disable this behavior
    override the method by None value or use :class:`.UnhandledExecutor`.
    """
    __slots__ = ('output', '__stdout__', '__stderr__', 'env')

    CANCEL_PREFIX = "CANCEL_EXECUTE_"
    STDOUT = subprocess.PIPE
    STDERR = subprocess.STDOUT
    DEVNULL = subprocess.DEVNULL
    CalledProcessError = subprocess.CalledProcessError
    env: tp.Dict[str, str]

    def __init__(
            self,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            **environ_variables: str,
    ):
        self.output = ''
        self.__stdout__ = stdout
        self.__stderr__ = stderr
        self.env = environ_variables

    def write_output(self, line) -> None:
        """
        :param line: -- line from command output
        :type line: str
        :return: None
        :rtype: None
        """
        self.output += str(line)

    async def working_handler(self, proc: asyncio.subprocess.Process):
        # pylint: disable=unused-argument
        """
        Additional handler for executions.

        :arg proc: running process
        :type proc: asyncio.subprocess.Process
        """

    async def line_handler(self, line) -> None:
        write_output = self.write_output
        if not asyncio.iscoroutinefunction(write_output):
            write_output = sync_to_async(write_output, thread_sensitive=True)
        if line is not None:  # pragma: no branch
            with raise_context():
                await write_output(line)

    async def _handle_process(self, proc: asyncio.subprocess.Process, stream='stdout'):
        stream_object: asyncio.StreamReader = getattr(proc, stream)
        working_handler = self.working_handler
        if not asyncio.iscoroutinefunction(working_handler):
            working_handler = sync_to_async(working_handler, thread_sensitive=True)  # nocv

        # Run handler periodically until stream object is closed
        while not stream_object.at_eof():
            await working_handler(proc)
            await asyncio.sleep(0.01)

    async def _unbuffered_read(self, proc: asyncio.subprocess.Process, stream='stdout'):
        async for line in getattr(proc, stream):
            await self.line_handler(line.decode('utf-8'))

    async def _run_subprocess(self, cmd, cwd, env_vars=None):
        # Run pre execution hook.
        await self.pre_execute(
            cmd=cmd,
            cwd=cwd,
            env=env_vars,
        )
        # Cleanup output variable
        self.output = ""
        # Setup environment variables
        env = os.environ.copy()
        env.update(self.env)
        if env_vars:
            env.update(env_vars)

        # Start execution process
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=self.__stdout__,
            stderr=self.__stderr__,
            env=env,
            cwd=str(cwd),
            bufsize=0,
            close_fds=ON_POSIX,
        )

        # Setup process output handlers
        # and wait until it ends
        tasks = [self._unbuffered_read(proc)]
        if self.working_handler is not None:
            tasks.append(self._handle_process(proc))
        await asyncio.gather(*tasks)

        # Parse return code and handle post execution hook
        return_code = proc.returncode
        try:
            if return_code:
                logger.error(self.output)
                raise self.CalledProcessError(
                    return_code, cmd, output=str(self.output)
                )
        finally:
            await self.post_execute(
                cmd=cmd,
                cwd=cwd,
                env=env_vars,
                return_code=return_code,
            )

    async def pre_execute(self, cmd, cwd, env):
        """
        Runs before execution starts.

        :param cmd: -- list of cmd command and arguments
        :param cwd: -- workdir for executions
        :param env: -- extra environment variables which overrides defaults
        """

    async def post_execute(self, cmd, cwd, env, return_code):
        """
        Runs after execution end.

        :param cmd: -- list of cmd command and arguments
        :param cwd: -- workdir for executions
        :param env: -- extra environment variables which overrides defaults
        :param return_code: -- return code of executed process
        """

    async def aexecute(self, cmd, cwd, env=None):
        """
        Executes commands and outputs its result. Asynchronous implementation.

        :param cmd: -- list of cmd command and arguments
        :param cwd: -- workdir for executions
        :param env: -- extra environment variables which overrides defaults
        :return: -- string with full output
        """
        await self._run_subprocess(cmd, cwd, env)
        return self.output

    def execute(self, cmd, cwd, env=None):
        """
        Executes commands and outputs its result.

        :param cmd: -- list of cmd command and arguments
        :param cwd: -- workdir for executions
        :param env: -- extra environment variables which overrides defaults
        :return: -- string with full output
        """
        return async_to_sync(self.aexecute)(cmd, cwd, env)


class UnhandledExecutor(Executor):
    """
    Class based on :class:`.Executor` but disables `working_handler`.
    """
    __slots__ = ()
    working_handler = None


class KVExchanger(BaseVstObject):
    """
    Class for transmit data using key-value fast (cache-like) storage between
    services. Uses same cache-backend as Lock.
    """
    __slots__ = ('key', 'timeout', '__djangocache__')
    TIMEOUT = 60
    __djangocache__: tp.Any

    @classproperty
    def PREFIX(cls):
        # pylint: disable=no-self-argument
        return f"{cls.get_django_settings('VST_PROJECT_LIB')}_exchange_"

    @classproperty
    def cache(cls):
        # pylint: disable=no-self-argument,no-member,access-member-before-definition
        if hasattr(cls, '__djangocache__') and not is_member_descriptor(cls.__djangocache__):
            return cls.__djangocache__
        cls.__djangocache__ = cls.get_django_cache('locks')
        return cls.cache

    def __init__(self, key, timeout=None):
        self.key = self.PREFIX + str(key)
        self.timeout = timeout or self.TIMEOUT

    def send(self, value, ttl=None):
        # pylint: disable=no-member
        return self.cache.add(self.key, value, ttl or self.timeout)

    def prolong(self, ttl=None):
        # pylint: disable=no-member
        self.cache.touch(self.key, ttl or self.timeout)

    def get(self):
        # pylint: disable=no-member
        value = self.cache.get(self.key)
        self.cache.delete(self.key)
        return value

    def delete(self):
        # pylint: disable=no-member
        self.cache.delete(self.key)


class Lock(KVExchanger):
    """
    Lock class for multi-jobs workflow. Based on :class:`.KVExchanger`.
    The Lock allows only one thread to enter the part that's locked and shared
    between apps using one locks cache (see also `[locks] <config.html#locks-settings>`_).


    :param id: -- unique id for lock.
    :type id: int,str
    :param payload: -- lock additional info. Should be any boolean True value.
    :param repeat: -- time to wait lock.release. Default 1 sec.
    :type repeat: int
    :param err_msg: -- message for AcquireLockException error.
    :type err_msg: str

    .. note::
        - Used django.core.cache lib and settings in `settings.py`
        - Have Lock.SCHEDULER and Lock.GLOBAL id

    Example:
        .. sourcecode:: python

            from vstutils.utils import Lock

            with Lock("some_lock_identifier", repeat=30, err_msg="Locked by another proccess") as lock:
                # where
                # ``"some_lock_identifier"`` is unique id for lock and
                # ``30`` seconds lock is going wait until another process will release lock id.
                # After 30 sec waiting lock will raised with :class:`.Lock.AcquireLockException`
                # and ``err_msg`` value as text.
                some_code_execution()
                # ``lock`` object will has been automatically released after
                # exiting from context.

    Another example without context manager:
        .. sourcecode:: python

            from vstutils.utils import Lock

            # locked block after locked object created
            lock = Lock("some_lock_identifier", repeat=30, err_msg="Locked by another proccess")
            # deleting of object calls ``lock.release()`` which release and remove lock from id.
            del lock

    """
    __slots__ = ('id', 'payload_data')
    TIMEOUT = 60 * 60 * 24
    GLOBAL = "global-deploy"
    SCHEDULER = "celery-beat"

    class AcquireLockException(Exception):
        """ Exception which will be raised on unreleased lock. """

    @classproperty
    def PREFIX(cls):
        # pylint: disable=no-self-argument
        return f"{cls.get_django_settings('VST_PROJECT_LIB')}_lock_"

    def __init__(self, id, payload=1, repeat=1, err_msg="", timeout=None):
        # pylint: disable=too-many-arguments
        super().__init__(id, timeout)
        self.payload_data = f'{uuid.uuid4()}_{payload}'
        self.id, start = None, time.time()
        while time.time() - start <= repeat:
            if self.send(self.payload_data) and not time.sleep(random.random()) and self.get() == self.payload_data:
                logger.debug(f'Acquire lock with id `{id}` and payload `{self.payload_data}`')
                self.id = id
                return
            time.sleep(random.random() / 10)
        raise self.AcquireLockException(err_msg)

    def get(self):  # nocv
        # pylint: disable=no-member
        return self.cache.get(self.key)

    def __enter__(self):
        return self

    def __exit__(self, type_e, value, tb):
        self.release()

    def release(self, force_release=False):
        # pylint: disable=no-member
        if force_release or self.id is not None:
            self.cache.delete(self.key)

    def __del__(self):
        self.release()


class __LockAbstractDecorator:
    __slots__ = ('kwargs',)
    _err = "Wait until the end."
    _lock_key = None

    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.kwargs["err_msg"] = self.kwargs.get("err_msg", self._err)

    def execute(self, func, *args, **kwargs):
        if self._lock_key is not None:
            with Lock(self._lock_key, **self.kwargs):
                return func(*args, **kwargs)
        return func(*args, **kwargs)

    def __call__(self, original_function):
        @wraps(original_function)
        def wrapper(*args, **kwargs):
            return self.execute(original_function, *args, **kwargs)

        return wrapper


class model_lock_decorator(__LockAbstractDecorator):
    """
    Decorator for functions where 'pk' kwarg exist
    for lock by id.

    .. warning::
        - On locked error raised ``Lock.AcquireLockException``
        - Method must have and called with ``pk`` named arg.

    """
    __slots__ = ('_lock_key',)
    _err = "Object locked. Wait until unlock."

    def execute(self, func, *args, **kwargs):
        self._lock_key = kwargs.get('pk', None)
        return super().execute(func, *args, **kwargs)


class Paginator(BasePaginator):
    """
    Class for fragmenting the query for small queries.
    """

    def __init__(self, qs, chunk_size=None):
        """
        :param qs: -- queryset for fragmenting
        :type qs: django.db.models.QuerySet
        :param chunk_size: -- size of the fragments.
        :type chunk_size: int
        """
        chunk_size = chunk_size or BaseVstObject().get_django_settings("PAGE_LIMIT", None)
        super().__init__(qs, chunk_size)

    def __iter__(self):
        for page in range(1, self.num_pages + 1):
            yield self.page(page)

    def items(self):
        for page in self:
            for obj in page.object_list:
                obj.paginator = self
                obj.page = page
                yield obj


class ObjectHandlers(BaseVstObject):
    """
    Handlers wrapper for get objects from some settings structure.

    Example:
        .. sourcecode:: python

            from vstutils.utils import ObjectHandlers

            '''
            In `settings.py` you should write some structure:

            SOME_HANDLERS = {
                "one": {
                    "BACKEND": "full.python.path.to.module.SomeClass"
                },
                "two": {
                    "BACKEND": "full.python.path.to.module.SomeAnotherClass",
                    "OPTIONS": {
                        "some_named_arg": "value"
                    }
                }
            }
            '''

            handlers = ObjectHandlers('SOME_HANDLERS')

            # Get class handler for 'one'
            one_backend_class = handlers['one']
            # Get object of backend 'two'
            two_obj = handlers.get_object()
            # Get object of backend 'two' with overriding constructor named arg
            two_obj_overrided = handlers.get_object(some_named_arg='another_value')

    :param type_name: type name for backends.Like name in dict.
    :type type_name: str

    """

    __slots__ = ('type', 'err_message', '__list__', '__loaded_backends__')

    type: str
    err_message: tp.Optional[str]

    def __init__(self, type_name, err_message=None):
        self.type = type_name
        self.err_message = err_message
        self.__list__ = None
        self.__loaded_backends__ = {}

    @property
    def objects(self):
        return {name: self[name] for name in self.list()}

    def __len__(self):  # pragma: no cover
        return len(self.objects)

    def __iter__(self):
        return iter(self.items())

    def __getitem__(self, name):
        return self.backend(name)

    def __call__(self, name, obj):
        return self.get_object(name, obj)

    def __dict__(self):  # pragma: no cover
        return self.items()

    def keys(self):
        return self.objects.keys()

    def values(self):  # pragma: no cover
        return dict(self).values()

    def items(self):
        return self.objects.items()

    def list(self):
        if self.__list__ is None:
            self.__list__ = self.get_django_settings(self.type, {})
        return self.__list__

    def _get_backend(self, backend):
        if backend in self.__loaded_backends__:
            return self.__loaded_backends__[backend]
        self.__loaded_backends__[backend] = import_string(backend)
        return self.__loaded_backends__[backend]

    def get_backend_data(self, name):
        return self.list()[name]

    def get_backend_handler_path(self, name):
        return self.get_backend_data(name).get('BACKEND', None)

    def backend(self, name):
        """
        Get backend class

        :param name: -- name of backend type
        :type name: str
        :return: class of backend
        :rtype: type,types.ModuleType,object
        """
        try:
            backend = self.get_backend_handler_path(name)
            if backend is None:
                raise ex.VSTUtilsException("Backend is 'None'.")  # pragma: no cover
            return self._get_backend(backend)
        except (KeyError, ImportError) as err:
            msg = f"{name} ({self.err_message})" if self.err_message else name
            raise ex.UnknownTypeException(msg) from err

    def opts(self, name):
        return self.get_backend_data(name).get('OPTIONS', {})

    def get_object(self, name, *args, **kwargs):
        opts = self.opts(name)
        opts.update(kwargs)
        return self[name](*args, **opts)


class ModelHandlers(ObjectHandlers):
    """
    Handlers for some models like 'INTEGRATIONS' or 'REPO_BACKENDS'.
    Based on :class:`.ObjectHandlers` but more specific for working with models.
    All handlers backends get by first argument model object.

    **Attributes**:

    :param objects: -- dict of objects like: ``{<name>: <backend_class>}``
    :type objects: dict
    :param keys: -- names of supported backends
    :type keys: list
    :param values: -- supported backends classes
    :type values: list
    :param type_name: type name for backends.Like name in dict.
    """

    __slots__ = ()

    def get_object(self, name, obj):
        """
        :param name: -- string name of backend
        :param name: str
        :param obj: -- model object
        :type obj: django.db.models.Model
        :return: backend object
        :rtype: object
        """
        return self[name](obj, **self.opts(name))


class URLHandlers(ObjectHandlers):
    """
    Object handler for GUI views. Uses `GUI_VIEWS` from settings.py.
    Based on :class:`.ObjectHandlers` but more specific to urlpatterns.

    Example:
        .. sourcecode:: python

            from vstutils.utils import URLHandlers


            # By default gets from `GUI_VIEWS` in `settings.py`
            urlpatterns = list(URLHandlers())
    :param type_name: type name for backends.Like name in dict.
    """
    __slots__ = ('additional_handlers', '__handlers__', 'default_namespace')

    additional_handlers: tp.List[tp.Text]

    def __init__(self, type_name='URLS', *args, **kwargs):
        self.additional_handlers = kwargs.pop('additional_handlers', ['VIEWS']) + [type_name]
        self.default_namespace = kwargs.pop('namespace', None)
        self.__handlers__ = None
        super().__init__(type_name, *args, **kwargs)

    @property
    def view_handlers(self):
        if not self.__handlers__:
            self.__handlers__ = tuple(map(self.__class__, self.additional_handlers))
        return self.__handlers__

    def get_backend_data(self, name):
        data = super().get_backend_data(name)
        if isinstance(data, str):
            for handler in self.view_handlers:
                try:
                    return handler.get_backend_data(data)
                except:  # nosec
                    continue
            raise ex.VSTUtilsException(f'Invalid handler name "{data}"')  # nocv
        return data

    def get_object(self, name, *argv, **kwargs):
        """
        Get url object tuple for urls.py

        :param name: url regexp from
        :type name: str
        :param argv: overridden args
        :param kwargs: overridden kwargs
        :return: url object
        :rtype: django.urls.re_path
        """
        regexp = name
        options = self.opts(regexp)
        options.update(kwargs)
        args = options.pop('view_args', argv)
        view_kwargs = options.pop('view_kwargs', {})
        csrf_enable = self.get_backend_data(regexp).get('CSRF_ENABLE', True)
        view_class = self[name]
        namespace = view_kwargs.pop('namespace', self.default_namespace)
        result: tp.Union[tuple, types.ModuleType]

        if any(s in regexp for s in (r'^', r'$', r'(', r'?')):
            path_handler = re_path
        else:
            path_handler = path

        if isinstance(view_class, View) or hasattr(view_class, 'as_view'):
            view = view_class.as_view(**view_kwargs)
            if not csrf_enable:
                view = csrf_exempt(view)
            return path_handler(regexp, view, *args, **options)
        elif (isinstance(view_class, types.ModuleType) and
              hasattr(view_class, 'urlpatterns') and
              hasattr(view_class, 'app_name')):
            result = view_class
            namespace = None
        else:
            result = (view_class, 'gui')
        return path_handler(regexp, include(result, namespace=namespace), *args, **view_kwargs)

    def urls(self):
        for regexp in self.list():
            yield self.get_object(regexp)

    def __iter__(self):
        return self.urls()


class VstEnumMeta(EnumMeta):
    LOWER = object()
    UPPER = object()
    SAME = object()

    def __new__(metacls, cls, bases, classdict):
        # pylint: disable=bad-mcs-classmethod-argument
        mutated_types = {}
        for key, value in classdict.items():
            if value is metacls.LOWER:
                dict.__setitem__(classdict, key, key.lower())
                mutated_types[key] = str.lower
            elif value is metacls.UPPER:
                dict.__setitem__(classdict, key, key.upper())
                mutated_types[key] = str.upper
            elif value is metacls.SAME:
                dict.__setitem__(classdict, key, key)
                mutated_types[key] = str
        classdict['__mutated_types__'] = mutated_types
        result = super().__new__(metacls, cls, bases, classdict)
        if result.__members__:
            result.max_len = max(len(i) for i in result.__members__)
        return result


class VstEnum(Enum, metaclass=VstEnumMeta):
    pass


class BaseEnum(str, VstEnum):
    """
    BaseEnum extends :class:`enum.Enum` class and used to create enum-like objects that can be used in
    django serializers or django models.

    Example:
        .. sourcecode:: python

            from vstutils.models import BModel


            class ItemClasses(BaseEnum):
                FIRST = BaseEnum.SAME
                SECOND = BaseEnum.SAME
                THIRD = BaseEnum.SAME


            class MyDjangoModel(BModel):
                item_class = models.CharField(max_length=ItemClasses.max_len, choices=ItemClasses.to_choices())

                @property
                def is_second(self):
                    # Function check is item has second class of instance
                    return ItemClasses.SECOND.is_equal(self.item_class)

    .. note::
        For special cases, when value must be in lower or upper case, you can setup value as ``BaseEnum.LOWER`` or
        ``BaseEnum.UPPER``. But in default cases we recommend use ``BaseEnum.SAME`` for memory optimization.
    """

    def __new__(cls, name):
        return str.__new__(cls, name)

    def __repr__(self):
        return repr(self.__str__())

    def __str__(self):
        return self.__mutated_types__.get(self.name, str)(self.name)

    def __hash__(self):
        return hash(str(self))

    @classmethod
    def get_names(cls):
        return tuple(x.name for x in cls)

    @classmethod
    def to_choices(cls):
        return list_to_choices(str(x) for x in cls)

    def is_equal(self, cmp_str):
        return str(cmp_str) == str(self)

    def not_equal(self, cmp_str):
        return not self.is_equal(cmp_str)


@lru_cache(maxsize=1)
def get_session_store() -> 'SessionBase':
    engine = import_module(settings.SESSION_ENGINE)
    return engine.SessionStore


def add_in_vary(headers: dict, value: str):
    """
    Adds provided value to Vary header if not added already
    """
    vary = cc_delim_re.split(
        headers.get('Vary', '').lower()
    )
    if value.lower() not in vary:
        vary.append(value)
        headers['Vary'] = ', '.join(vary)


def check_request_etag(request, etag_value, header_name="If-None-Match", operation_handler=str.__eq__):
    """
    The function plays a crucial role within the context of the ETag mechanism,
    providing a flexible way to validate client-side ETags against the server-side version for both cache validation
    and ensuring data consistency in web applications.
    It supports conditional handling of HTTP requests based on the match or mismatch of ETag values,
    accommodating various scenarios such as cache freshness checks and prevention of concurrent modifications.

    :param request: The HTTP request object containing the client's headers,
                    from which the ETag for comparison is retrieved.
    :type request: :class:`rest_framework.request.Request`
    :param etag_value: The server-generated ETag value that represents the current state of the resource.
                       This unique identifier is recalculated whenever the resource's content changes.
    :type etag_value: :class:`str`
    :param header_name: Specifies the HTTP header to look for the client's ETag.
                        Defaults to "If-None-Match", commonly used in GET requests for cache validation.
                        For operations requiring confirmation that the client is acting on the latest version
                        of a resource (e.g., PUT or DELETE), "If-Match" should be used instead.
    :type header_name: :class:`str`
    :param operation_handler: A function to compare the ETags. By default, this is set to ``str.__eq__``,
                              which checks for an exact match between the client's and server's ETags,
                              suitable for validating caches with ``If-None-Match``.
                              To handle ``If-Match`` scenarios, where the operation should proceed only if the ETags
                              do not match, indicating the resource has been modified, ``str.__ne__`` (not equal)
                              can be used as the operation handler. This flexibility allows for precise control over how
                              and when clients are allowed to read from or write to resources based on their version.

    :return: Returns a tuple containing the server's ETag and a boolean flag.
             The flag is ``True`` if the operation handler condition between the server's and client's ETag is met,
             indicating the request should proceed based on the matching logic defined by the operation handler;
             otherwise, it returns ``False``.
    """
    header = request.headers.get(header_name)

    if not header:
        return etag_value, False

    header = str(header)
    if header[:2] in {'W/', "w/"}:
        header = header[2:]

    if header[0] != '"':
        header = f'"{header}"'

    if etag_value[0] != '"':
        etag_value = f'"{etag_value}"'

    if operation_handler(etag_value, header):
        return etag_value, True

    return etag_value, False


try:
    from ._utils import encode, decode  # noqa: F811
except ImportError:  # nocv
    pass
