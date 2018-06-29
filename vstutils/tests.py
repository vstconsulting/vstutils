# pylint: disable=unused-import
from __future__ import unicode_literals
import json  # noqa: F401
import random
import string
import os  # noqa: F401
import six
from django.db import transaction
from django.test import TestCase, override_settings  # noqa: F401
from django.conf import settings
from django.contrib.auth.models import User
try:
    from mock import patch
except ImportError:  # nocv
    from unittest.mock import patch
from .utils import import_class


class BaseTestCase(TestCase):
    models = None
    std_codes = dict(get=200, post=201, patch=200, delete=204)

    def setUp(self):
        self.user = self._create_user()
        self.login_url = getattr(settings, 'LOGIN_URL', '/login/')
        self.logout_url = getattr(settings, 'LOGOUT_URL', '/logout/')

    @classmethod
    def patch(cls, *args, **kwargs):
        return patch(*args, **kwargs)

    def get_model_class(self, model):
        if isinstance(model, (six.text_type, six.string_types)):
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

    def random_name(self, length=8):
        return ''.join(random.sample(string.ascii_lowercase, length))

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
        response = client.login(**{'username': self.user.data['username'],
                                   'password': self.user.data['password']})
        self.assertTrue(response)
        return client

    def _logout(self, client):
        self.assertEqual(client.get(self.logout_url).status_code, 302)

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

    @transaction.atomic
    def result(self, request, url, code=200, *args, **kwargs):
        response = request(url, *args, **kwargs)
        self.assertRCode(response, code)
        return self.__get_rendered(response)

    def assertCount(self, list, count):
        self.assertEqual(len(list), count)

    def assertRCode(self, resp, code=200):
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

    def get_result(self, rtype, url, code=None, *args, **kwargs):
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
            if isinstance(kwargs["data"], (six.string_types, six.text_type)):
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
