# pylint: disable=unused-import,consider-using-f-string
import typing as _t
import random  # noqa: F401
import string  # noqa: F401
import os  # noqa: F401
import uuid
import warnings
from time import time
from importlib import import_module
from unittest.mock import patch, Mock
import json  # noqa: F401

import ormsgpack
from authlib.jose import jwt
from django.apps import apps
from django.http import StreamingHttpResponse
from django.db import transaction, models as django_models
from django.core.exceptions import BadRequest
from django.contrib.sessions.backends.base import SessionBase
from django.conf import settings
from django.test import TestCase, override_settings  # noqa: F401
from django.contrib.auth import get_user_model
from django.utils.module_loading import import_string
from fastapi.testclient import TestClient

from .utils import raise_context_decorator_with_default
from .api.renderers import ORJSONRenderer
from .oauth2.jwk import jwk_set

User = get_user_model()

BulkDataType = _t.Union[_t.List[_t.Dict[_t.Text, _t.Any]], str, bytes, bytearray]
ApiResultType = _t.Union[BulkDataType, _t.Dict, _t.Sequence[BulkDataType]]

patched_get_session = patch("vstutils.oauth2.authentication._get_session_store").start()
patched_get_session.side_effect = lambda: import_module(settings.SESSION_ENGINE).SessionStore


class BaseTestCase(TestCase):
    """
    Main test case class extends :class:`django.test.TestCase`.
    """
    server_name = 'vstutilstestserver'

    #: oAuth2 server class
    server_class = import_string(settings.OAUTH_SERVER_CLASS)

    #: oAuth2 client id
    client_token_app_id = list(settings.OAUTH_SERVER_CLIENTS.keys())[0]

    #: oAuth2 grant type
    client_token_grant_type = settings.OAUTH_SERVER_CLIENTS[client_token_app_id]['allowed_grant_types'][0]

    #: oAuth2 scopes
    client_token_scopes = 'openid read write'

    client_oauth_session = True

    #: Attribute with default project models module.
    models = None

    #: Default http status codes for different http methods. Uses in :meth:`.get_result`
    std_codes: _t.Dict[_t.Text, int] = {
        'get': 200,
        'post': 201,
        'patch': 200,
        'delete': 204
    }
    use_msgpack = False

    class user_as:
        # pylint: disable=invalid-name
        """
        Context for execute bulk or something as user.
        The context manager overrides ``self.user`` in TestCase and revert this
        changes on exit.

        :param user: new user object for execution.
        :type user: django.contrib.auth.models.AbstractUser
        """

        def __init__(self, testcase, user):
            self.testcase = testcase
            self.user = user

        def __enter__(self):
            self.old_user = self.testcase.user
            self.testcase.user = self.user
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            self.testcase.user = self.old_user

    @property
    def api_test_client(self):
        return TestClient(
            import_string(settings.ASGI_APPLICATION),
            base_url=f"https://{self.server_name}",
        )

    def _create_user(self, is_super_user=True, **kwargs):
        username = kwargs.pop('username', self.random_name())
        email = kwargs.pop('email', username + '@gmail.com')
        password = kwargs.pop('password', username.upper())
        if is_super_user:
            user = User.objects.create_superuser(username=username,
                                                 password=password,
                                                 email=email,
                                                 **kwargs)
        else:
            user = User.objects.create_user(username=username,
                                            password=password,
                                            email=email,
                                            **kwargs)
        user.data = {'username': username, 'password': password}
        return user

    def get_oauth2_server(self):
        return self.server_class()

    def generate_token_for_session(self, session: SessionBase):
        oauth_server = self.get_oauth2_server()
        client = oauth_server.query_client(self.client_token_app_id)
        payload = {
            'iss': settings.OAUTH_SERVER_ISSUER,
            'aud': client.get_client_id(),
            'client_id': client.get_client_id(),
            'jti': str(session.session_key),
            'sub': str(session.get('user_id', None)),
            'scope': self.client_token_scopes,
            'exp': int(time()) + 3600,
            'iat': int(time()),
        }
        header = {
            'alg': settings.OAUTH_SERVER_JWT_ALG,
            'typ': 'at+jwt'
        }
        return jwt.encode(header, payload, key=jwk_set).decode('utf-8')

    def login_user(self, user=None, client=None):
        client = client or self.client
        client.force_login(user or self.user)
        # Make OAuth2 auth over session auth
        if self.client_oauth_session:
            client.session.save()
            client.defaults.setdefault('Sec-Fetch-Site', 'same-origin')
            client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.generate_token_for_session(client.session)}'
        return client

    def logout_user(self, client=None):
        self._logout(client or self.client)

    def _login(self):
        client = self.client
        client.force_login(self.user)
        # Make OAuth2 auth over session auth
        if self.client_oauth_session:
            client.session.save()
            client.defaults.setdefault('Sec-Fetch-Site', 'same-origin')
            client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.generate_token_for_session(client.session)}'
        return client

    def _logout(self, client):
        saved_cookies = client.cookies
        client.logout()
        client.defaults.pop('Sec-Fetch-Site', None)
        client.defaults.pop('HTTP_AUTHORIZATION', None)
        client.cookies = saved_cookies

    def _check_update(self, url, data, **fields):
        """
        Test update instance of model

        :param url: url to instance
        :param data: update fields
        :param fields: checking resulted fields as named args
        :return: None

        """
        self.get_result(fields.pop('method', 'patch'), url, data=json.dumps(data))
        result = self.get_result("get", url)
        self.assertTrue(isinstance(result, dict))
        for field, value in fields.items():
            self.assertEqual(result[field], value)

    def __get_rendered(self, response):
        # pylint: disable=protected-access
        try:
            if isinstance(response, StreamingHttpResponse):
                return b''.join(response.streaming_content).decode('utf-8')
            media_type = f'{getattr(response, "accepted_media_type", "")}' or \
                         response._content_type_for_repr.split(";")[0].replace('"', '').replace(',', '').strip()
            rendered_content: _t.Union[str, bytes] = (
                getattr(response, "rendered_content", False) or response.content
            )
            if media_type == 'application/msgpack':
                return ormsgpack.unpackb(rendered_content)
            if getattr(rendered_content, 'decode', None):
                rendered_content = str(rendered_content.decode('utf-8'))
            try:
                if media_type in ('application/json', 'application/openapi+json'):
                    return json.loads(rendered_content)
                raise BadRequest
            except:
                return str(rendered_content)
        except ValueError:  # nocv
            return None

    def setUp(self):
        self.settings_obj = settings
        self.client_kwargs = {
            "HTTP_X_FORWARDED_PROTOCOL": 'https',
            'SERVER_NAME': self.server_name
        }
        self.client = self.client_class(**self.client_kwargs)
        self.user = self._create_user()
        self.last_response = None

    def _settings(self, item, default=None):
        return getattr(self.settings_obj, item, default)

    def random_name(self) -> _t.Text:
        """
        Simple function which returns uuid1 string.
        """
        return str(uuid.uuid1())

    def get_url(self, *items) -> _t.Text:
        """
        Function for creating url path based on ``VST_API_URL`` and ``VST_API_VERSION`` settings.
        Without arguments returns path to default version of api.

        :return: string like ``/api/v1/.../.../`` where ``...`` is args of function.
        """

        vst_api_url = self._settings("VST_API_URL")
        vst_api_version = self._settings("VST_API_VERSION")

        items = items[2:] if items[:2] == (vst_api_url, vst_api_version) else items

        url = f'/{vst_api_url}/{vst_api_version}/'
        url += "".join(f'{i}/' for i in filter(bool, items))

        return url

    @classmethod
    def patch(cls, *args, **kwargs) -> _t.ContextManager[Mock]:
        """
        Simple :func:`unittest.mock.patch` class-method wrapper.
        """
        return patch(*args, **kwargs)

    @classmethod
    def patch_field_default(cls, model: django_models.Model, field_name: str, value: _t.Any) -> _t.ContextManager[Mock]:
        """
        This method helps to path default value in the model's field.
        It's very useful for DateTime fields where :func:`django.utils.timezone.now` is used in defaults.
        """
        return patch.object(model._meta.get_field(field_name), 'get_default', new=lambda: value)

    def get_model_class(self, model) -> django_models.Model:
        """
        Getting model class by string or return model arg.

        :param model: string which contains model name (if attribute ``model`` is set to the test case class),
                      module import, ``app.ModelName`` or :class:`django.db.models.Model`.
        :type model: str,django.db.models.Model
        :return: Model class.
        :rtype: django.db.models.Model

        """

        handlers = (
            lambda x: getattr(self.models, x, None) if self.models is not None else None,
            import_string,
            apps.get_model
        )

        if isinstance(model, str):
            for handler in map(raise_context_decorator_with_default(default=None), handlers):
                result = handler(model)
                if result:
                    model = result
                    break

        assert not isinstance(model, str), f"couldn't find '{model}'."
        return model

    def get_model_filter(self, model, **kwargs):
        """
        Simple wrapper over :meth:`.get_model_class` which returns filtered
        queryset from model.

        :param model: string which contains model name (if attribute ``model`` is set to the test case class),
                      module import, ``app.ModelName`` or :class:`django.db.models.Model`.
        :type model: str,django.db.models.Model
        :param kwargs: named arguments to :meth:`django.db.models.query.QuerySet.filter`.
        :rtype: django.db.models.query.QuerySet

        """
        return self.get_model_class(model).objects.filter(**kwargs)

    def get_count(self, model, **kwargs):
        """
        Simple wrapper over :meth:`.get_model_filter` which returns counter of items.

        :param model: string which contains model name (if attribute ``model`` is set to the test case class),
                      module import, ``app.ModelName`` or :class:`django.db.models.Model`.
        :type model: str,django.db.models.Model
        :param kwargs: named arguments to :meth:`django.db.models.query.QuerySet.filter`.
        :return: number of instances in database.
        :rtype: int
        """
        return self.get_model_filter(model, **kwargs).count()

    def change_identity(self, is_super_user=False):
        old_user = self.user
        self.user = self._create_user(is_super_user)
        return old_user

    def render_api_response(self, response):
        return self.__get_rendered(response)

    @transaction.atomic
    def result(self, request, url, code=200, *args, **kwargs):
        response = request(url, *args, secure=True, **kwargs)
        self.last_response = response
        self.assertRCode(response, code, url)
        return self.render_api_response(response)

    def assertCount(self, iterable: _t.Sized, count: int, msg: _t.Any = None):
        """
        Calls :func:`len` over ``iterable`` and checks equality with ``count``.

        :param iterable: any iterable object which could be sended to :func:`len`.
        :param count: expected result.
        :param msg: error message

        """
        self.assertEqual(len(iterable), count, msg)

    def assertRCode(self, resp, code=200, *additional_info):
        """
        Fail if response code is not equal. Message is response body.

        :param resp: response object
        :type resp: django.http.HttpResponse
        :param code: expected code
        :type code: int
        """
        err_msg = "{} != {}\n{}\n{}".format(
            resp.status_code, code,
            self.__get_rendered(resp) if not isinstance(resp, StreamingHttpResponse) else '<StreamingHttpResponse>',
            self.user
        )
        if additional_info:
            err_msg += '\nAdditional info:\n'
            err_msg += '\n'.join([str(i) for i in additional_info])
        self.assertEqual(resp.status_code, code, err_msg)

    def assertCheckDict(self, first: _t.Dict, second: _t.Dict, msg: _t.Text = None):
        """
        Fail if the two fields in dicts are unequal as determined by the '==' operator.
        Checks if first not contains or not equal field in second
        """
        for field_name in first.keys():
            self.assertEqual(
                first[field_name], second.get(field_name, None), msg or [first, second]
            )

    def post_result(self, url, code=None, *args, **kwargs):
        return self.get_result("post", url, code, *args, **kwargs)

    def get_result(self, rtype, url, code: int = None, *args, **kwargs) -> ApiResultType:
        """
        Executes and tests response code on request with returning parsed result of request.
        The method uses the following procedure:

        - Test client authorization (with :attr:`.user` which creates in :meth:`.setUp`).
        - Executing a request (sending args and kwargs to request method).
        - Parsing the result (converts json string to python-object).
        - Checking the http status code with :meth:`.assertRCode`
          (if you have not specified it,
          the code will be selected in accordance with the request method
          from the standard set :attr:`.std_codes`).
        - Logout client.
        - Return parsed result.

        :param rtype:     request type (methods from Client cls): get, post etc.
        :param url:       requested url string or tuple for :meth:`.get_url`.
                          You can use :meth:`.get_url` for url building or setup it as full string.
        :param code:      expected return code from request.
        :param relogin:   execute force login and logout on each call. Default is ``True``.
        :param args:      extra-args for Client class request method.
        :param kwargs:    extra-kwargs for Client class request method.
        :return:          result of request.

        """

        relogin = kwargs.get('relogin', True)

        if relogin:
            client = self._login()
        else:
            client = self.client

        request_handler = getattr(client, rtype)

        if data := kwargs.get("data", False):
            if isinstance(data, str):
                kwargs["content_type"] = "application/json"
            elif isinstance(data, (dict, list, tuple, set)):
                kwargs["content_type"] = "application/json"
                kwargs['data'] = json.dumps(data)
            elif isinstance(data, (bytes, bytearray)):
                kwargs["content_type"] = "application/msgpack"

        if 'content_type' in kwargs and kwargs["content_type"].startswith('application/'):
            kwargs['HTTP_ACCEPT'] = kwargs["content_type"]

        kwargs['code'] = code or self.std_codes.get(rtype, 200)

        if isinstance(url, (tuple, list)):
            url = self.get_url(*url)

        result = self.result(request_handler, url, *args, **kwargs)

        if relogin:
            self._logout(client)

        return result

    def list_test(self, url, count):
        """
        Test for get list of models. Checks only list count. Uses :meth:`.get_result` method.

        :param url: url to abstract layer. For example: ``/api/v1/project/``.
                    You can use :meth:`.get_url` for building url.
        :param count: count of objects in DB.

        """
        result = self.get_result("get", url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], count)

    def details_test(self, url, **kwargs):
        """
        Test for get details of model. If you setup additional named arguments,
        the method check their equality with response data.
        Uses :meth:`.get_result` method.

        :param url: url to detail record. For example: ``/api/v1/project/1/`` (where ``1`` is uniq id of project).
                    You can use :meth:`.get_url` for building url.
        :param kwargs: params that's should be checked (key - field name, value - field value).

        """
        result = self.get_result("get", url)
        self.assertTrue(isinstance(result, dict))
        for key, value in kwargs.items():
            self.assertEqual(result[key], value)

    def endpoint_call(self, data: BulkDataType = None, method: str = 'get', code: int = 200, **kwargs) -> ApiResultType:
        """
        Makes request to endpoint and asserts response status code if specified (default is 200).
        Uses :meth:`.get_result` method for execution.

        :param data: request data
        :param method: http request method
        :param code: http status to assert
        :param query: dict with query data (working only with `get`)
        :return: bulk response
        """

        if data is not None:
            if self.use_msgpack:
                data = ormsgpack.packb(data, default=ORJSONRenderer.default)
            else:
                data = json.dumps(data, default=ORJSONRenderer.default)

        if method == 'get' and 'query' in kwargs and kwargs['query']:
            query = f'?{"&".join(map("=".join, kwargs.pop("query").items()))}'
        else:
            query = ''

        headers = kwargs.pop('headers', {})
        headers['accept-encoding'] = 'gzip'
        oldstyle_headers = set(filter(lambda x: x.startswith('HTTP_'), kwargs.keys()))

        if oldstyle_headers:
            warnings.warn(  # nocv
                "You should setup 'headers' instead of kwargs",
                DeprecationWarning,
                stacklevel=2,
            )

        for key in oldstyle_headers:
            headers.setdefault(key[5:].replace('_', '-').lower(), kwargs[key])  # nocv

        return self.get_result(
            method,
            f'/{self._settings("VST_API_URL")}/endpoint/{query}',
            data=data,
            code=code,
            headers=headers,
            **kwargs
        )

    def endpoint_schema(self, **kwargs):
        """
        Make request to schema. Returns dict with swagger data.

        :param version: API version for schema parser.
        """
        return self.endpoint_call(query={**kwargs, 'format': 'openapi'})

    def bulk(self, data: BulkDataType, code: int = 200, **kwargs) -> ApiResultType:
        """
        Makes non-transactional bulk request and asserts status code (default is 200)

        :param data: request data
        :param code: http status to assert
        :param kwargs: named arguments for :meth:`.get_result`
        :return: bulk response
        """
        return self.endpoint_call(data, method='put', code=code, **kwargs)

    def bulk_transactional(self, data: BulkDataType, code: int = 200, **kwargs) -> ApiResultType:
        """
        Make transactional bulk request and assert status code (default is 200)

        :param data: request data
        :param code: http status to assert
        :param kwargs: named arguments for :meth:`.get_result`
        :return: bulk response
        """
        return self.endpoint_call(data, method='post', code=code, **kwargs)
