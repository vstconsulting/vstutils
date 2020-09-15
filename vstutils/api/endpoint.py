import typing as _t
import json
import logging
import traceback
import functools
from concurrent.futures import ThreadPoolExecutor, Executor
from collections import OrderedDict

from django.conf import settings
from django.db import transaction
from django.http import HttpResponse, HttpRequest
from django.contrib.auth.models import AbstractUser
from django.test.client import Client, ClientHandler
from django.test.utils import modify_settings
from drf_yasg.views import SPEC_RENDERERS
from rest_framework import serializers, views, versioning, request as drf_request
from rest_framework.authentication import (
    SessionAuthentication,
    BasicAuthentication,
    TokenAuthentication,
    BaseAuthentication
)

from . import responses
from .decorators import cache_method_result
from .serializers import DataSerializer
from .validators import UrlQueryStringValidator
from ..utils import Dict, raise_context
from ..middleware import BaseMiddleware

RequestType = _t.Union[drf_request.Request, HttpRequest]
logger: logging.Logger = logging.getLogger('vstutils')

THREADS_COUNT = settings.BULK_THREADS
API_URL: _t.Text = settings.API_URL
DEFAULT_VERSION = settings.VST_API_VERSION
REST_METHODS: _t.List[_t.Text] = list(
    m.upper() for m in views.APIView.http_method_names
)

default_authentication_classes = (
    SessionAuthentication,
    BasicAuthentication,
    TokenAuthentication
)

append_to_list = list.append


@functools.singledispatch
def _get_request_data(request_data: _t.Iterable) -> _t.Union[_t.List, _t.Tuple]:
    assert isinstance(request_data, (list, tuple)), 'Request data must be list or tuple.'
    return request_data


@_get_request_data.register(dict)
def _get_request_data_dict(request_data):
    return [request_data]


@_get_request_data.register(str)
def _get_request_data_str(request_data):
    return _get_request_data(json.loads(request_data))  # nocv


def _iter_request(request, operation_handler, context):
    executor_class = _DummyExecutor
    if request.method not in ('POST', 'PUT'):
        executor_class = ThreadPoolExecutor if THREADS_COUNT else executor_class
    handler = lambda o: operation_handler(o, context)
    with executor_class(max_workers=THREADS_COUNT) as executor:
        for operation_result in executor.map(handler, _get_request_data(request.data)):
            yield operation_result


def _join_paths(*args) -> _t.Text:
    '''Join multiple path fragments into one

    :param *args: List of items that can be anything like '/a/b/c', 'b/c/', 1, 'v1'
    :returns: Path that starts and ends with
    '''
    return f"/{'/'.join(str(arg).strip('/') for arg in args)}/"


class _DummyExecutor(Executor):
    # pylint: disable=abstract-method

    def __init__(self, *args, **kwargs):
        super().__init__()

    def map(self, fn, *iterables, timeout=None, chunksize=1):
        return map(fn, *iterables)


class ParseResponseDict(dict):
    __slots__ = ('timing',)
    timing: _t.SupportsFloat

    def __init__(self, path: _t.Text, method: _t.Text, response: HttpResponse):
        super().__init__(
            path=path,
            status=response.status_code,
            data=self._get_rendered(response),
            method=method
        )
        self.timing = float(response.get('Response-Time', '0.0'))

    def _get_rendered(self, response: _t.Union[HttpResponse, responses.BaseResponseClass]):
        try:
            result = response.data  # type: ignore
            if isinstance(result, dict):
                return Dict(result)
        except:
            pass
        if response.status_code != 404 and getattr(response, "rendered_content", False):  # nocv
            return json.loads(response.rendered_content.decode())  # type: ignore
        return Dict(detail=str(response.content.decode('utf-8')))


class BulkRequestType(drf_request.Request, HttpRequest):
    # pylint: disable=abstract-method
    data: _t.List[_t.Dict[_t.Text, _t.Any]]  # type: ignore
    version: _t.Optional[_t.Text]
    successful_authenticator: _t.Optional[BaseAuthentication]


class BulkMiddleware(BaseMiddleware):
    def request_handler(self, request: HttpRequest) -> HttpRequest:
        request.is_bulk = True  # type: ignore
        if 'user' in request.META:
            request.user = request.META.pop('user')
            # pylint: disable=protected-access
            request._cached_user = request.user  # type: ignore
        return request


class BulkClientHandler(ClientHandler):
    @modify_settings(MIDDLEWARE=settings.MIDDLEWARE_ENDPOINT_CONTROL)
    def __init__(self, *args, **kwargs):
        super().__init__(enforce_csrf_checks=False, *args, **kwargs)
        if self.__class__.__name__ == 'BulkClientHandler':
            self.load_middleware()


class BulkClient(Client):
    handler: BulkClientHandler = BulkClientHandler()
    user: _t.Optional[AbstractUser]

    def __init__(self, enforce_csrf_checks=False, **defaults):
        # pylint: disable=bad-super-call
        self.user = defaults.pop('user', None)
        super(Client, self).__init__(**defaults)
        self.exc_info = None

    def request(self, **request):
        if self.user:
            request['user'] = self.user
        response = self.handler(self._base_environ(**request))
        if response.cookies:
            self.cookies.update(response.cookies)  # nocv
        return response


class FormatDataFieldMixin:
    """
    Mixin for fields that can format "<< >>" templates inside strings
    """

    requires_context: bool = True
    context: _t.Dict

    def to_internal_value(self, data) -> _t.Text:
        result = super().to_internal_value(data)  # type: ignore

        if isinstance(result, str) \
                and '<<' in result \
                and '>>' in result \
                and not ('{' in result and '}' in result) \
                and 'results' in self.context:
            result = result.replace('<<', '{').replace('>>', '}').format(*self.context['results'])
            with raise_context():
                return json.loads(result)

        return result


class TemplateStringField(FormatDataFieldMixin, serializers.CharField):
    """
    Field that can format "<< >>" templates inside strings
    """


class RequestDataField(FormatDataFieldMixin, DataSerializer):
    """
    Field that can handle basic data types and recursise
    format template strings inside them
    """

    def to_internal_value(self, data):
        if isinstance(data, str):
            pass

        elif isinstance(data, (list, tuple)):
            return [self.to_internal_value(i) for i in data]

        elif isinstance(data, (dict, OrderedDict)):
            return type(data)(
                (super(RequestDataField, self).to_internal_value(k), self.to_internal_value(v))
                for k, v in data.items()
            )

        return super(RequestDataField, self).to_internal_value(data)


class MethodChoicesField(serializers.ChoiceField):
    """Field for HTTP method"""

    def __init__(self, choices: _t.List = None, **kwargs):
        super().__init__(choices or REST_METHODS, **kwargs)

    def to_internal_value(self, data):
        return super(MethodChoicesField, self).to_internal_value(str(data).upper())


class PathField(TemplateStringField):

    def to_internal_value(self, data):

        if isinstance(data, str):
            data = (data, )

        return _join_paths(*[
            super(PathField, self).to_internal_value(path)
            for path in data
        ])


class OperationSerializer(serializers.Serializer):
    # pylint: disable=abstract-method
    path = PathField(required=True)
    method = MethodChoicesField(required=True)
    headers = serializers.DictField(child=TemplateStringField(), default={}, write_only=True)
    data = RequestDataField(required=False, default=None, allow_null=True)  # type: ignore
    status = serializers.IntegerField(read_only=True, default=500)
    info = serializers.CharField(read_only=True)
    query = TemplateStringField(required=False,
                                allow_blank=True,
                                default='',
                                validators=[UrlQueryStringValidator()],
                                write_only=True)
    version = serializers.ChoiceField(choices=list(settings.API.keys()),
                                      default=settings.VST_API_VERSION,
                                      write_only=True)

    def to_representation(self, instance: _t.Dict[_t.Text, _t.Any]) -> Dict:
        return Dict(super().to_representation(instance))

    def get_operation_method(self, method: _t.Text) -> _t.Callable:
        return getattr(self.context.get('client'), method.lower())

    def create(self, validated_data: _t.Dict[_t.Text, _t.Union[_t.Text, _t.Mapping]]) -> _t.Dict[_t.Text, _t.Any]:
        # pylint: disable=protected-access
        method = self.get_operation_method(str(validated_data['method']))
        url = _join_paths(API_URL, validated_data['version'], validated_data['path'])
        query = validated_data['query']
        if query:
            url += '?' + str(query)
        return ParseResponseDict(
            path=url,
            method=str(validated_data['method']),
            response=method(  # type: ignore
                url,
                content_type='application/json',
                secure=self.context['request']._request.is_secure(),
                data=validated_data['data'],
                **validated_data['headers']
            )
        )


class EndpointViewSet(views.APIView):
    schema = None  # type: ignore
    versioning_class = versioning.QueryParameterVersioning  # type: ignore
    renderer_classes = list(views.APIView.renderer_classes) + list(SPEC_RENDERERS)
    session_cookie_name: _t.ClassVar[_t.Text] = settings.SESSION_COOKIE_NAME
    client_environ_keys_copy: _t.List[_t.Text] = [
        "SCRIPT_NAME",
        "SERVER_NAME",
        "SERVER_PORT",
        "SERVER_PROTOCOL",
        "SERVER_SOFTWARE",
        "REMOTE_ADDR",
        "HTTP_X_FORWARDED_PROTOCOL",
        "HTTP_HOST",
        "HTTP_USER_AGENT"
    ]

    serializer_class = OperationSerializer

    def get_client(self, request: BulkRequestType) -> BulkClient:
        """
        Returns test client and guarantees that if bulk request comes
        authenticated than test client will be authenticated with the same user
        """
        return BulkClient(**self.original_environ_data(request=request))

    def original_environ_data(self, request: BulkRequestType, *args) -> _t.Dict:
        get_environ = request.META.get
        kwargs = {}
        for env_var in tuple(self.client_environ_keys_copy) + args:
            value = get_environ(env_var, None)
            if value:
                kwargs[env_var] = str(value)
        if request.user.is_authenticated:
            if isinstance(request.successful_authenticator, SessionAuthentication):
                kwargs['HTTP_COOKIE'] = str(request.META.get('HTTP_COOKIE'))
            elif isinstance(request.successful_authenticator, (BasicAuthentication, TokenAuthentication)):
                kwargs['HTTP_AUTHORIZATION'] = str(request.META.get('HTTP_AUTHORIZATION'))
            kwargs['user'] = request.user  # type: ignore
        return kwargs

    def get_serializer(self, *args, **kwargs) -> OperationSerializer:
        """
        Return the serializer instance that should be used for validating and
        deserializing input, and for serializing output.
        """
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context(kwargs.get('context', {}))
        return serializer_class(*args, **kwargs)

    @cache_method_result
    def get_serializer_class(self):
        """
        Return the class to use for the serializer.
        Defaults to using `self.serializer_class`.

        You may want to override this if you need to provide different
        serializations depending on the incoming request.

        (Eg. admins get full serialization, others get basic serialization)
        """
        assert self.serializer_class is not None, (
            "'%s' should either include a `serializer_class` attribute, "
            "or override the `get_serializer_class()` method."
            % self.__class__.__name__
        )

        return self.serializer_class

    def get_serializer_context(self, context) -> dict:
        """
        Extra context provided to the serializer class.
        """
        if 'client' not in context:  # nocv
            context = context.copy()
            context['client'] = self.get_client(_t.cast(BulkRequestType, self.request))
        return {
            'request': self.request,
            'view': self,
            **context
        }

    @transaction.atomic()
    def operate(self, operation_data: _t.Dict, context: _t.Dict) -> _t.Tuple[_t.Dict, _t.SupportsFloat]:
        """Method used to handle one operation and return result of it"""
        serializer = self.get_serializer(data=operation_data, context=context)
        try:
            serializer.is_valid(raise_exception=True)
            return serializer.to_representation(serializer.save()), serializer.instance.timing  # type: ignore
        except Exception as err:
            return {
                'path': 'bulk',
                'info': {
                    'errors': getattr(serializer, '_errors', traceback.format_exc()),
                    'operation_data': operation_data
                },
                'status': 500,
                'data': dict(detail=f'Error in bulk request data. See info. Original message: {str(err)}')
            }, 0.0

    def get(self, request: BulkRequestType) -> HttpResponse:
        """Returns response with swagger ui or openapi json schema if ?format=openapi"""

        url = f'/api/{getattr(request, "version", DEFAULT_VERSION) or DEFAULT_VERSION}/_openapi/'

        if request.query_params.get('format') == 'openapi':  # type: ignore
            url += '?format=openapi'

        return self.get_client(request).get(url, secure=request.is_secure())

    def post(self, request: BulkRequestType) -> responses.BaseResponseClass:
        """Execute transactional bulk request"""
        try:
            with transaction.atomic():
                return self.put(request, allow_fail=False)
        except Exception:
            logger.debug(traceback.format_exc())
            return responses.HTTP_502_BAD_GATEWAY(self.results)

    def put(self, request: BulkRequestType, allow_fail=True) -> responses.BaseResponseClass:
        """Execute non transaction bulk request"""
        context = {
            'client': self.get_client(request),
            'results': self.results
        }
        timings: _t.List = []
        for result, timing in _iter_request(request, self.operate, context):
            append_to_list(self.results, result)
            append_to_list(timings, timing)
            if not allow_fail and not (100 <= result.get('status', 500) < 400):
                raise Exception(f'Execute transaction stopped. Error message: {str(result)}')
        return responses.HTTP_200_OK(self.results, timings={f'op{i}': float(j) for i, j in enumerate(timings)})

    def patch(self, request: BulkRequestType) -> responses.BaseResponseClass:
        return self.put(request)

    def initial(self, request: drf_request.Request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.results: _t.List[_t.Dict[_t.Text, _t.Any]] = []

    def finalize_response(self, request: drf_request.Request, *args, **kwargs):
        if not isinstance(request.successful_authenticator, default_authentication_classes):
            self.get_client(_t.cast(BulkRequestType, self.request)).logout()
        return super().finalize_response(request, *args, **kwargs)
