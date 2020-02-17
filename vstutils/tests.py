# pylint: disable=unused-import
from __future__ import unicode_literals
import typing as _t
import json  # noqa: F401
import random  # noqa: F401
import string  # noqa: F401
import os  # noqa: F401
import uuid
from django.db import transaction
from django.test import TestCase, override_settings  # noqa: F401
from django.contrib.auth import get_user_model

try:
    from mock import patch
except ImportError:  # nocv
    from unittest.mock import patch
from .utils import import_class


User = get_user_model()


class BaseTestCase(TestCase):
    server_name = 'vstutilstestserver'
    models = None
    std_codes = dict(get=200, post=201, patch=200, delete=204)

    class user_as:
        # pylint: disable=invalid-name
        '''
        Context for do something as another user in TestCase
        '''

        def __init__(self, testcase, user):
            self.testcase = testcase
            self.user = user

        def __enter__(self):
            self.old_user = self.testcase.user
            self.testcase.user = self.user
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            self.testcase.user = self.old_user

    def _create_user(self, is_super_user=True):
        username = self.random_name()
        email = username + '@gmail.com'
        password = username.upper()
        if is_super_user:
            user = User.objects.create_superuser(username=username,
                                                 password=password,
                                                 email=email)
        else:
            user = User.objects.create_user(username=username,
                                            password=password,
                                            email=email)
        user.data = {'username': username, 'password': password}
        return user

    def _login(self):
        client = self.client
        client.force_login(self.user)
        return client

    def _logout(self, client):
        self.assertEqual(client.get(self.logout_url).status_code, 302)

    def _check_update(self, url, data, **fields):
        '''
        Test update instance of model
        :param url: - url to instance
        :param data: - update fields
        :param fields: - checking resulted fields as named args
        :return: None
        '''
        self.get_result(fields.pop('method', 'patch'), url, data=json.dumps(data))
        result = self.get_result("get", url)
        self.assertTrue(isinstance(result, dict))
        for field, value in fields.items():
            self.assertEqual(result[field], value)

    def __get_rendered(self, response):
        try:
            rendered_content = (
                getattr(response, "rendered_content", False) or response.content
            )
            if getattr(rendered_content, 'decode', False):
                rendered_content = str(rendered_content.decode('utf-8'))
            try:
                return json.loads(rendered_content)
            except:
                return str(rendered_content)
        except ValueError:  # nocv
            return None

    def setUp(self):
        from django.conf import settings
        self.settings_obj = settings
        client_kwargs = {
            "HTTP_X_FORWARDED_PROTOCOL": 'https',
            'SERVER_NAME': self.server_name
        }
        self.client = self.client_class(**client_kwargs)
        self.user = self._create_user()
        self.login_url = getattr(self.settings_obj, 'LOGIN_URL', '/login/')
        self.logout_url = getattr(self.settings_obj, 'LOGOUT_URL', '/logout/')

    def _settings(self, item, default=None):
        return getattr(self.settings_obj, item, default)

    def random_name(self):
        return str(uuid.uuid1())

    def get_url(self, item=None, pk=None, sub=None):
        url = f'/{self._settings("VST_API_URL")}/{self._settings("VST_API_VERSION")}/'
        url += f"{item}/" if item else ''
        url += f"{pk}/" if pk else ''
        url += f'{sub}/' if sub else ''
        return url

    @classmethod
    def patch(cls, *args, **kwargs):  # nocv
        return patch(*args, **kwargs)

    def get_model_class(self, model):
        if isinstance(model, str):
            model_string = str(model)
            model = getattr(self.models, model_string, None)
            model = import_class(model_string) if model is None else model
        return model

    def get_model_filter(self, model, **kwargs):
        return self.get_model_class(model).objects.filter(**kwargs)

    def get_count(self, model, **kwargs):
        return self.get_model_filter(model, **kwargs).count()

    def change_identity(self, is_super_user=False):
        old_user = self.user
        self.user = self._create_user(is_super_user)
        return old_user

    def render_api_response(self, response):
        return self.__get_rendered(response)

    @transaction.atomic
    def result(self, request, url, code=200, *args, **kwargs):
        response = request(url, secure=True, *args, **kwargs)
        self.assertRCode(response, code, url)
        return self.render_api_response(response)

    def assertCount(self, list, count, msg=None):
        self.assertEqual(len(list), count, msg)

    def assertRCode(self, resp, code=200, *additional_info):
        '''
        Fail if response code is not equal. Message is response body.
        :param resp: - response object
        :param code: - expected code
        :return: None
        '''
        err_msg = "{} != {}\n{}\n{}".format(
            resp.status_code, code,
            self.__get_rendered(resp),
            self.user
        )
        if additional_info:
            err_msg += '\nAdditional info:\n'
            err_msg += '\n'.join([str(i) for i in additional_info])
        self.assertEqual(resp.status_code, code, err_msg)

    def assertCheckDict(self, first, second, msg=None):
        '''
        Fail if the two fields in dicts are unequal as determined by the '=='
           operator.
        Checks if fist not contains or not equal field in second
        '''
        for field_name in first.keys():
            self.assertEqual(
                first[field_name], second.get(field_name, None), msg or [first, second]
            )

    def post_result(self, url, code=None, *args, **kwargs):
        return self.get_result("post", url, code, *args, **kwargs)

    def get_result(self, rtype, url, code=None, *args, **kwargs) -> _t.Union[_t.Dict, _t.Sequence]:
        '''
        Test request with returning result of request
        :param rtype:  - request type (methods from Client cls): get, post etc
        :param url:    - requested url
        :param code:   - expected return code from request.
        :param args:   - extra-args for Client class
        :param kwargs: - extra-kwargs for Client class
        :return:       - result of request
        '''
        client = self._login()
        request = getattr(client, rtype)
        code = code or self.std_codes.get(rtype, 200)
        if kwargs.get("data", False):
            if isinstance(kwargs["data"], str):
                kwargs["content_type"] = "application/json"
        result = self.result(request, url, code=code, *args, **kwargs)
        self._logout(client)
        return result

    def mass_create(self, url, data, *fields):
        '''
        Mass creation objects in api-abstration
        :param url: - url to abstract layer
        :param data: - fields of model
        :params fields: - list of fields to check
        :return: - list of id by every resulted models
        '''
        results_id = []
        counter = 0
        for dt in data:
            result = self.get_result("post", url, 201, data=json.dumps(dt))
            self.assertTrue(isinstance(result, dict))
            for field in fields:
                st = "[~~ENCRYPTED~~]"
                if field == "vars" and st in result['vars'].values():
                    pass  # nocv
                else:
                    self.assertEqual(result[field], data[counter][field])
            results_id.append(result["id"])
            counter += 1
        return results_id

    def list_test(self, url, count):
        '''
        Test for get list of models
        :param url: - url to abstract layer
        :param count: - count of objects in DB
        :return: None
        '''
        result = self.get_result("get", url)
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result["count"], count)

    def details_test(self, url, **kwargs):
        '''
        Test for get details of model
        :param url: - url to abstract layer
        :param **kwargs: - params thats should be
                          (key - field name, value - field value)
        :return: None
        '''
        result = self.get_result("get", url)
        self.assertTrue(isinstance(result, dict))
        for key, value in kwargs.items():
            self.assertEqual(result[key], value)

    def get_bulk(self, item, data, type, **kwargs):
        return dict(type=type, item=item, data=data, **kwargs)

    def get_mod_bulk(self, item, pk, data, mtype, method="POST", **kwargs):
        return self.get_bulk(
            item, data, 'mod',
            pk=pk, data_type=mtype, method=method.upper(), **kwargs
        )

    def make_bulk(self, data, method_type='post'):
        return self.get_result(
            method_type, self.get_url('_bulk'), 200, data=json.dumps(data)
        )
