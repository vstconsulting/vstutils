# pylint: disable=import-error,invalid-name,no-member,function-redefined,unused-import
from pathlib import Path

import gzip
import os
import sys
import shutil
import re
import io
import pwd
import base64
import datetime
from pathlib import Path
from smtplib import SMTPException

from unittest.mock import patch, PropertyMock

from collections import OrderedDict

from bs4 import BeautifulSoup
from django import VERSION as django_version
from django.conf import settings
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.template.exceptions import TemplateDoesNotExist
from django.middleware.csrf import _get_new_csrf_token
from django.core.cache import cache
from django.contrib.auth.hashers import make_password
from django.contrib.auth import get_user_model
from django.test import Client
from django.http import FileResponse, HttpResponseNotModified
from django.urls import reverse
from fakeldap import MockLDAP
from requests.auth import HTTPBasicAuth
from rest_framework.test import CoreAPIClient

from vstutils import utils
from vstutils.api.validators import (
    RegularExpressionValidator,
    ImageValidator,
    ImageOpenValidator,
    ImageHeightValidator,
    ImageWidthValidator,
    ImageResolutionValidator
)
from vstutils.api.auth import UserViewSet
from vstutils.exceptions import UnknownTypeException
from vstutils.ldap_utils import LDAP
from vstutils.models.fields import MultipleFieldFile
from vstutils.templatetags.vst_gravatar import get_user_gravatar
from vstutils.tests import BaseTestCase, json, override_settings
from vstutils.tools import get_file_value
from vstutils.urls import router
from vstutils.models import get_centrifugo_client
from vstutils import models
from vstutils.api import serializers, fields
from vstutils.utils import SecurePickling, BaseEnum

from .models import (
    File,
    Host,
    HostGroup,
    List,
    Author,
    Post,
    OverridenModelWithBinaryFiles,
    ModelWithBinaryFiles,
    ModelForCheckFileAndImageField,
    DeepNestedModel
)
from rest_framework.exceptions import ValidationError
from base64 import b64encode
from vstutils.api.fields import FkField

DIR_PATH = os.path.abspath('test_proj')
test_config = '''[main]
test_key = test_value
'''

test_handler_structure = {
    "User": {
        "BACKEND": "django.contrib.auth.models.User",
        'OPTIONS': {
        }
    }
}

packaje_json_data = {
    "name": "test_project",
    "version": "1.0.0",
    "browserslist": [
        "> 0.25%",
        "not dead"
    ],
    "scripts": {
        "build": "APP_ENV=prod webpack",
        "buildAnalyze": "APP_ENV=prod BUNDLE_ANALYZER=true webpack",
        "buildJson": "APP_ENV=prod webpack --profile --json > stat.json",
        "devBuild": "webpack",
        "styleCheck": "prettier --check frontend_src/**",
        "styleFix": "prettier --write frontend_src/**"
    },
    "dependencies": {},
    "devDependencies": {
        "@babel/core": "^7.12.0",
        "@babel/plugin-transform-runtime": "^7.13.10",
        "@babel/preset-env": "^7.12.0",
        "babel-loader": "^8.1.0",
        "core-js": "^3.6.4",
        "css-loader": "^3.4.2",
        "dotenv": "^8.2.0",
        "file-loader": "^5.1.0",
        "node-sass": "^4.13.1",
        "optimize-css-assets-webpack-plugin": "^5.0.3",
        "prettier": "^2.0.2",
        "sass-loader": "^8.0.2",
        "style-loader": "^1.1.3",
        "url-loader": "^3.0.0",
        "vue-loader": "^15.9.1",
        "vue-template-compiler": "^2.6.11",
        "webpack": "^4.43.0",
        "webpack-bundle-analyzer": "^3.6.0",
        "webpack-cli": "^3.3.12"
    }
}

validator_dict = {
    'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
}


def to_soup(content):
    return BeautifulSoup(content, 'html.parser')


class VSTUtilsCommandsTestCase(BaseTestCase):

    def setUp(self):
        super(VSTUtilsCommandsTestCase, self).setUp()
        self.project_place = '/tmp/test_project'
        self.remove_project_place(self.project_place)

    def tearDown(self):
        super(VSTUtilsCommandsTestCase, self).tearDown()
        self.remove_project_place(self.project_place)

    def remove_project_place(self, path):
        try:
            shutil.rmtree(path)
        except OSError:
            pass

    def test_deprecation_functions(self):
        @utils.deprecated
        def testing_func(code):
            return code

        self.assertEqual(testing_func(1), 1)

    def test_executors(self):
        dir_name = os.path.dirname(__file__)
        cmd = utils.UnhandledExecutor(stderr=utils.UnhandledExecutor.DEVNULL)
        self.assertEqual('yes', cmd.execute('echo yes'.split(' '), dir_name))
        cmd = utils.Executor(stderr=utils.Executor.DEVNULL)
        self.assertEqual('yes', cmd.execute('echo yes'.split(' '), dir_name))
        cmd = utils.Executor()
        with utils.raise_context():
            cmd.execute('bash -c "python0.0 --version"'.split(' '), dir_name)

    def test_startproject(self):
        # Easy create
        out = io.StringIO()
        utils.Executor(stderr=utils.Executor.DEVNULL).execute('mkdir /tmp/test_project'.split(' '), '/tmp')
        call_command(
            'newproject', '--name', 'test_project', interactive=0, dir='/tmp', stdout=out
        )
        self.assertIn(
            f'Project successfully created at {self.project_place}.',
            out.getvalue()
        )
        with self.assertRaises(Exception):
            call_command(
                'newproject', '--name', 'test_project', interactive=0, dir='/tmp', stdout=out
            )
        self.assertTrue(os.path.exists(self.project_place))
        self.assertTrue(os.path.isdir(self.project_place))
        self.assertTrue(os.path.exists(self.project_place + '/test_project'))
        self.assertTrue(os.path.isdir(self.project_place + '/test_project'))
        self.assertTrue(os.path.exists(self.project_place + '/test_project/__init__.py'))
        self.assertTrue(os.path.isfile(self.project_place + '/test_project/__init__.py'))
        self.assertTrue(os.path.exists(self.project_place + '/test_project/__main__.py'))
        self.assertTrue(os.path.isfile(self.project_place + '/test_project/__main__.py'))
        self.assertTrue(os.path.exists(self.project_place + '/test_project/settings.py'))
        self.assertTrue(os.path.isfile(self.project_place + '/test_project/settings.py'))
        self.assertTrue(os.path.isfile(self.project_place + '/setup.py'))
        self.assertTrue(os.path.isfile(self.project_place + '/setup.cfg'))
        self.assertTrue(os.path.isfile(self.project_place + '/requirements.txt'))
        self.assertTrue(os.path.isfile(self.project_place + '/README.rst'))
        self.assertTrue(os.path.isfile(self.project_place + '/MANIFEST.in'))
        self.assertTrue(os.path.isfile(self.project_place + '/test.py'))
        self.assertDictEqual(json.loads(Path(self.project_place + '/package.json').read_text()), packaje_json_data)

        self.remove_project_place(self.project_place)
        with self.assertRaises(Exception):
            call_command('newproject', '--name', 'test_project', dir=None, interactive=0)

    def test_dockerrun(self):
        with self.patch('subprocess.check_call') as mock_obj:
            mock_obj.side_effect = lambda *args, **kwargs: 'OK'
            call_command('dockerrun', attempts=4, attempts_timeout=0.01)
            self.maxDiff = 1024 * 100
            self.assertEqual(mock_obj.call_count, 2)
            self.assertEqual(
                mock_obj.call_args[0][0],
                [sys.executable, '-m', 'test_proj', 'web']
            )
            mock_obj.reset_mock()

            def check_call_error(*args, **kwargs):
                raise Exception('Test exception.')

            mock_obj.side_effect = check_call_error
            with self.assertRaises(SystemExit):
                call_command('dockerrun', attempts=1, attempts_timeout=0.0001)


class VSTUtilsTestCase(BaseTestCase):

    def _get_test_ldap(self, client, data):
        self.client.post(self.login_url, data=data, HTTP_X_AUTH_PLUGIN='DJANGO')
        response = client.get('/api/v1/user/')
        self.assertNotEqual(response.status_code, 200)
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, 302)

    @patch('ldap.initialize')
    def test_ldap_auth(self, ldap_obj):
        User = self.get_model_class('django.contrib.auth.models.User')
        User.objects.create(username='admin', password='some_strong_password')
        # Test on fakeldap
        admin = "admin@test.lan"
        admin_password = "ldaptest"
        admin_dict = {"userPassword": admin_password, 'cn': [admin]}
        LDAP_obj = MockLDAP({
            admin: admin_dict,
            "cn=admin,dc=test,dc=lan": admin_dict,
            'test': {"userPassword": admin_password}
        })
        data = dict(username=admin, password=admin_password)
        client = Client()
        ldap_obj.return_value = LDAP_obj
        self._get_test_ldap(client, data)
        data['username'] = 'test'
        with override_settings(LDAP_DOMAIN='test.lan'):
            self._get_test_ldap(client, data)
        with override_settings(LDAP_DOMAIN='TEST'):
            self._get_test_ldap(client, data)

        # Unittest
        ldap_backend = LDAP(
            'ldap://10.10.10.22',
            admin.replace('@test.lan', ''),
            admin_password,
            'test.lan'
        )
        self.assertTrue(ldap_backend.isAuth())
        self.assertEqual(ldap_backend.domain_user, admin.replace('@test.lan', ''))
        self.assertEqual(ldap_backend.domain_name, 'test.lan')

        ldap_obj.reset_mock()

        admin_dict = {
            "objectCategory": ['top', 'user'],
            "userPassword": [admin_password],
            "userpassword": admin_password,
            'cn': [admin]
        }
        tree = {
            admin: admin_dict,
            "cn=admin,dc=test,dc=lan": admin_dict,
            "dc=test,dc=lan": {
                'cn=admin,dc=test,dc=lan': admin_dict,
                'cn=test,dc=test,dc=lan': {"objectCategory": ['person', 'user']},
            }
        }
        LDAP_obj = MockLDAP(tree)
        ldap_obj.return_value = LDAP_obj
        with self.assertRaises(LDAP.InvalidDomainName):
            LDAP('ldap://10.10.10.22', '')
        with self.assertRaises(LDAP.InvalidDomainName):
            LDAP('ldap://10.10.10.22', ' ')
        with self.assertRaises(LDAP.InvalidDomainName):
            LDAP('ldap://10.10.10.22', admin.replace('test.lan', ''), admin_password)
        ldap_backend = LDAP('ldap://10.10.10.22', admin, domain='test.lan')
        self.assertFalse(ldap_backend.isAuth())
        with self.assertRaises(LDAP.NotAuth):
            ldap_backend.group_list()
        ldap_backend.auth(admin, admin_password)
        self.assertTrue(ldap_backend.isAuth())
        self.assertEqual(
            json.loads(ldap_backend.group_list())["dc=test,dc=lan"],
            tree["dc=test,dc=lan"]
        )

    def test_model_handler(self):
        test_handler_structure["User"]['OPTIONS'] = dict(username='test')
        with override_settings(TEST_HANDLERS=test_handler_structure):
            backend = test_handler_structure['User']['BACKEND']
            handler = utils.ModelHandlers("TEST_HANDLERS")
            self.assertIsInstance(
                handler.backend('User')(), self.get_model_class(backend)
            )
            self.assertCount(handler.keys(), 1)
            self.assertCount(handler.values(), 1)
            self.assertEqual(list(handler.items())[0][0], "User")
            self.assertEqual(list(handler.items())[0][1], self.get_model_class(backend))
            obj = handler.get_object('User', self.user.id)
            self.assertEqual(obj.username, "test")
            self.assertEqual(obj.id, self.user.id)
            with self.assertRaises(UnknownTypeException) as err:
                handler.get_object('Unknown', self.user)
            self.assertEqual(repr(err.exception), 'Unknown type Unknown.')
            for key, value in handler:
                self.assertEqual(key, 'User')
                self.assertEqual(value, self.get_model_class(backend))
            self.assertEqual(handler('User', self.user.id).id, self.user.id)

    def test_class_property(self):
        class TestClass(metaclass=utils.classproperty.meta):
            val = ''

            def __init__(self):
                self.val = "init"

            @utils.classproperty
            @classmethod
            def test(self):
                return self.val

            @test.setter
            def test(self, value):
                self.val = value

            @utils.classproperty
            def test2(self):
                return 'Some text'

        test_obj = TestClass()
        self.assertEqual(TestClass.test, "")
        self.assertEqual(test_obj.test, "init")
        test_obj.test = 'test'
        self.assertEqual(test_obj.val, 'test')
        with self.assertRaises(AttributeError):
            test_obj.test2 = 3
        with self.assertRaises(AttributeError):
            if TestClass.test2 == 'Some text':  # pragma: no branch
                TestClass.test2 = 3
        TestClass.test3 = 3

    def test_paginator(self):
        qs = self.get_model_filter('django.contrib.auth.models.User').order_by('email')
        for _ in utils.Paginator(qs, chunk_size=1).items():
            pass

        Host.objects.bulk_create([
            Host(name=f'paged_test_host_{str(i)}')
            for i in range(10)
        ])

        for _ in Host.objects.paged(chunk_size=1):
            pass

        Host.objects.filter(name__startswith="paged_test_host_").delete()

    def test_render_and_file(self):
        err_ini = utils.get_render('configs/config.ini', dict(config=dict(test=[])))
        for line in err_ini.split('\n'):
            self.assertEqual(line[0], '#')
        self.assertTrue('# Invalid config.' in err_ini, err_ini)
        config_dict = dict(config=dict(main=dict(test_key="test_value")))
        ini = utils.get_render('configs/config.ini', config_dict)
        with utils.tmp_file_context(ini, delete=False) as file:
            file_name = file.name
            file.write('\n')
            with open(file_name, 'r') as tmp_file:
                self.assertEqual(tmp_file.read(), test_config)
        try:
            self.assertFalse(utils.os.path.exists(file_name))
        except AssertionError:  # nocv
            utils.os.remove(file_name)
        try:
            with utils.tmp_file(ini) as file:
                file_name = file.name
                file.write('\n')
                with open(file_name, 'r') as tmp_file:
                    self.assertEqual(tmp_file.read(), test_config)
                raise Exception('Normal')
        except AssertionError:  # nocv
            raise
        except Exception:
            pass

        with utils.tmp_file_context() as file:
            with open(file.name, 'w') as output:
                with utils.redirect_stdany(output):
                    print("Test")
            with open(file.name, 'r') as output:
                self.assertEqual(output.read(), "Test\n")

    def test_boto3_storage_setting(self):
        self.assertTrue(isinstance(settings.AWS_S3_MAX_MEMORY_SIZE, int))
        self.assertEqual(settings.AWS_S3_MAX_MEMORY_SIZE, 123)
        self.assertTrue(isinstance(settings.AWS_QUERYSTRING_AUTH, bool))
        self.assertTrue(settings.AWS_QUERYSTRING_AUTH)
        self.assertFalse(settings.AWS_S3_VERIFY)
        self.assertTrue(isinstance(settings.GZIP_CONTENT_TYPES, tuple))
        self.assertEqual(settings.GZIP_CONTENT_TYPES, ('text/css', 'text/javascript'))

    def test_kvexchanger(self):
        exchenger = utils.KVExchanger("somekey")
        exchenger.send(True, 10)
        exchenger.prolong()
        self.assertTrue(exchenger.get())
        exchenger.delete()
        self.assertTrue(not exchenger.get())

    def test_locks(self):
        @utils.model_lock_decorator(repeat=0.01)
        def method(pk):
            # pylint: disable=unused-argument
            pass

        @utils.model_lock_decorator(repeat=0.01)
        def method2(pk):
            method(pk=pk)

        method(pk=123)
        method(pk=None)
        with self.assertRaises(utils.Lock.AcquireLockException):
            method2(pk=123)

    def test_raise_context(self):
        class SomeEx(KeyError):
            pass

        @utils.exception_with_traceback()
        def ex_method(ex=Exception('Valid ex')):
            raise ex

        with self.assertRaises(SomeEx) as exc:
            ex_method(SomeEx())

        self.assertTrue(getattr(exc.exception, 'traceback', False))
        with utils.raise_context(TypeError):
            ex_method(SomeEx())

        @utils.raise_context(SomeEx, exclude=Exception)
        def ex_method(ex=Exception('Valid ex')):
            raise ex

        ex_method(SomeEx())
        with self.assertRaises(Exception):
            ex_method()

        self.assertEqual(utils.exception_with_traceback()(lambda: 1)(), 1)

    def test_raise_context_with_default(self):
        @utils.raise_context_decorator_with_default(default='default')
        def get_value(t_dict):
            return t_dict['context']

        test = dict()
        self.assertEqual(get_value(test), 'default')
        test['some'] = 'key'
        self.assertEqual(get_value(test), 'default')
        test['context'] = 'custom'
        self.assertEqual(get_value(test), 'custom')

    def test_render_tags(self):
        self.assertEqual(
            utils.get_render('testproj.template', {"content_data": '{"extra_content": "dGVzdAo="}'}),
            '\n<img class="photo" src="data:image/png;base64,dGVzdAo=">\n'
        )


class ViewsTestCase(BaseTestCase):

    def test_main_views(self):
        # Main
        self.get_result('get', '/')
        self.get_result('post', self.logout_url, 302)
        self.get_result('post', self.login_url, 302)
        self.get_result('get', self.login_url, 302)
        # API
        api = self.get_result('get', '/api/')
        print(api)
        self.assertEqual(api['description'], 'Example Project REST API')
        self.assertEqual(api['current_version'], 'https://vstutilstestserver/api/v1/')
        self.assertIn('v1', api['available_versions'])
        self.assertIn('v2', api['available_versions'])
        self.assertEqual(api['available_versions']['v1'], api['current_version'])
        self.assertEqual(api['endpoint'], 'https://vstutilstestserver/api/endpoint')
        self.assertEqual(api['health'], 'https://vstutilstestserver/api/health')
        self.assertEqual(
            list(self.get_result('get', '/api/v1/').keys()).sort(),
            list(self.settings_obj.API[self.settings_obj.VST_API_VERSION].keys()).sort()
        )
        # 404
        self.get_result('get', '/api/v1/some/', code=404)
        self.get_result('get', '/other_invalid_url/', code=404)
        self.get_result('get', '/api/user/', code=404)
        self.get_result('get', '/api/v1/user/1000/', code=404)

        # Test js urls minification
        for js_url in ['service-worker.js']:
            response = self.get_result('get', f'/{js_url}')
            self.assertCount(str(response).split('\n'), 1, f'{js_url} is longer than 1 string.')

    def test_uregister(self):
        router_v1 = router.routers[0][1]
        router_v1.unregister("user")
        for pattern in router_v1.get_urls():
            if hasattr(pattern, 'pattern'):  # nocv
                regex = pattern.pattern.regex
            else:  # nocv
                regex = pattern.regex
            self.assertIsNone(regex.search("user/1/"))
        router_v1.register('user', UserViewSet)
        checked = False
        for pattern in router_v1.registry:
            if pattern[0] == 'user':
                checked = True
                self.assertEqual(pattern[1], UserViewSet)
        self.assertTrue(checked, "Not registered!")

    def test_settings_api(self):
        test_user = self._create_user(False)
        with self.user_as(self, test_user):
            result = self.get_result('get', '/api/v1/settings/')
        self.assertIn('system', result)
        self.assertIn('localization', result)
        self.details_test(
            '/api/v1/settings/localization/',
            LANGUAGE_CODE=self.settings_obj.LANGUAGE_CODE,
            TIME_ZONE=self.settings_obj.TIME_ZONE
        )
        self.details_test('/api/v1/settings/system/', PY=self.settings_obj.PY_VER)
        with self.user_as(self, test_user):
            result = self.get_result('get', '/api/v2/settings/')
        self.assertIn('new-action', result)
        self.assertNotIn('new-action-detail', result)
        self.assertIn('system', result)
        self.assertNotIn('localization', result)

    def test_users_api(self):
        self.list_test('/api/v1/user/', 1)
        self.details_test(
            f'/api/v1/user/{self.user.id}/',
            username=self.user.username, id=self.user.id
        )
        self.get_result('delete', f'/api/v1/user/{self.user.id}/', 409)

        user_data = dict(
            username="test_user", first_name="some", last_name='test', email="1@test.ru"
        )
        post_data = dict(
            password="some_password",
            password2='some_another_password',
            **user_data
        )
        self.get_result('post', '/api/v1/user/', data=post_data, code=400)
        post_data['password2'] = post_data['password']
        result = self.get_result('post', '/api/v1/user/', data=post_data)
        self.assertCheckDict(user_data, result)
        result = self.get_result('get', f'/api/v1/user/{result["id"]}/')
        self.assertCheckDict(user_data, result)
        self.get_result('patch', '/api/v1/user/', 405, data=dict(email=""))
        result = self.get_result('get', f'/api/v1/user/{result["id"]}/')
        self.assertCheckDict(user_data, result)
        user_data['first_name'] = 'new'
        post_data_dict = dict(partial=True, **user_data)
        self._check_update(
            f'/api/v1/user/{result["id"]}/', post_data_dict,
            method='put', **user_data
        )
        del post_data_dict['partial']
        post_data_dict['email'] = "skldjfnlkjsdhfljks"
        post_data_dict['password'] = "skldjfnlkjsdhfljks"
        post_data = json.dumps(post_data_dict)
        self.get_result(
            'patch', f'/api/v1/user/{result["id"]}/', data=post_data, code=400
        )
        self.get_result('delete', '/api/v1/user/{}/'.format(result['id']))
        user_data['email'] = 'invalid_email'
        post_data = dict(password="some_password", **user_data)
        self.post_result('/api/v1/user/', data=post_data, code=400)
        self.post_result('/api/v1/user/', data=user_data, code=400)
        result = self.post_result(
            '/api/v1/user/', data=dict(username=self.user.username), code=400
        )
        self.assertIn('username', result)
        self.assertEqual(result['username'], ['A user with that username already exists.'])
        self.assertCount(self.get_model_filter('django.contrib.auth.models.User'), 1)
        url_to_user = '/api/v1/user/{}/'.format(self.user.id)
        self.change_identity(False)
        self.get_result('get', url_to_user, 403)
        user_data['email'] = 'test@test.lan'
        self.post_result('/api/v1/user/', data=user_data, code=403)
        self.assertEqual(self.get_count('django.contrib.auth.models.User'), 2)
        self.get_result(
            'patch', '/api/v1/user/{}/'.format(self.user.id),
            data=json.dumps(dict(last_name=self.user.last_name))
        )
        invalid_old_password = dict(
            old_password='1',
            password='2',
            password2='2'
        )
        not_identical_passwords = dict(
            old_password=self.user.data['password'],
            password='2',
            password2='3'
        )
        update_password = dict(
            old_password=self.user.data['password'],
            password='12345',
            password2='12345'
        )
        user_get_request = {"method": "get", "path": ['user', 'profile']}
        self.client.post(
            f'{self.login_url}?lang=ru',
            data=self.user.data
        )
        results = self.bulk([
            {"method": "post", "path": ['user', 'profile', 'change_password'], "data": i}
            for i in (invalid_old_password, not_identical_passwords, update_password)
        ] + [user_get_request], relogin=False)
        self.assertEqual(results[0]['status'], 403)
        self.assertEqual(results[1]['status'], 400)
        self.assertEqual(results[2]['status'], 201)
        self.assertEqual(results[3]['status'], 200)
        self.assertEqual(results[3]['data']['username'], self.user.username)

        results = self.bulk([user_get_request], relogin=False)
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['username'], self.user.username)

        self._logout(self.client)

        self.change_identity(True)
        data = [
            {
                'username': "USER{}".format(i),
                'password': "123",
                'password2': "123",
            }
            for i in range(10)
        ]
        users_id = self.mass_create('/api/v1/user/', data, 'username')
        self.assertEqual(self.get_count('django.contrib.auth.models.User'), 13)
        comma_id_list = ",".join([str(i) for i in users_id])
        result = self.get_result('get', '/api/v1/user/?id={}'.format(comma_id_list))
        self.assertCount(users_id, result['count'])
        result = self.get_result('get', '/api/v1/user/?username=USER')
        self.assertCount(users_id, result['count'])
        result = self.get_result('get', '/api/v1/user/?username__not=USER')
        self.assertEqual(result['count'], 3)

        def raise_on_create(*args, **kwargs):
            raise Exception('test')

        with self.patch('vstutils.api.auth.UserSerializer.create') as mock:
            mock.side_effect = raise_on_create
            result = self.bulk([
                {'method': 'post', 'path': ['user'], 'data': {**data[0], 'username': 'qwe123123'}},
            ])[0]
            self.assertEqual(result['status'], 400)
            self.assertEqual(result['data']['detail'], 'test')

    @override_settings(AUTH_PASSWORD_VALIDATORS=[validator_dict])
    def test_password_validators(self):
        err_data = dict(
            old_password=self.user.data['password'],
            password='12345',
            password2='12345'
        )

        result = self.bulk([
            dict(path=['user', self.user.id, 'change_password'], data=err_data, method='post')
        ])

        self.assertEqual(result[0]['status'], 400)
        self.assertEqual(result[0]['data']['detail']['other_errors'][0], "This password is entirely numeric.")

    def test_user_gravatar(self):
        # test for get_gravatar method
        default_gravatar = '/static/img/anonymous.png'
        user_hash = '245cf079454dc9a3374a7c076de247cc'
        gravatar_link = 'https://www.gravatar.com/avatar/{}?d=mp'
        user_without_gravatar = dict(
            username="test_user_1",
            password="test_password_1",
            password2="test_password_1",
        )
        result = self.get_result('post', '/api/v1/user/', data=user_without_gravatar)
        self.assertEqual(default_gravatar, get_user_gravatar(result["id"]))
        user_with_gravatar = dict(
            username="test_user_2",
            password="test_password_2",
            password2="test_password_2",
            email="test1@gmail.com",
        )
        result = self.get_result('post', '/api/v1/user/', data=user_with_gravatar)
        self.assertEqual(
            gravatar_link.format(user_hash),
            get_user_gravatar(result["id"])
        )
        gravatar_of_nonexistent_user = get_user_gravatar(123321)
        self.assertEqual(default_gravatar, gravatar_of_nonexistent_user)

    def test_reset_password(self):
        test_user = self._create_user(is_super_user=False)
        client = self.client_class()
        response = client.post(self.login_url, {'username': test_user.username, 'password': test_user.password})
        self.assertEqual(response.status_code, 200)
        response = client.post(self.logout_url)
        self.assertEqual(response.status_code, 302)
        response = client.post(reverse('password_reset'), {'email': 'error@error.error'})
        self.assertEqual(response.status_code, 302)
        self.assertCount(mail.outbox, 0)
        response = client.post(reverse('password_reset'), {'email': test_user.email})
        self.assertEqual(response.status_code, 302)
        regex = r"^http(s)?:\/\/.*$"
        match = re.search(regex, mail.outbox[-1].body, re.MULTILINE)
        href = match.group(0)
        response = client.post(href, {'new_password1': 'newpass', 'new_password2': 'newpass'})
        self.assertEqual(response.status_code, 302)
        response = client.post(self.login_url, {'username': test_user.username, 'password': 'newpass'})
        self.assertEqual(response.status_code, 200)

    def test_register_new_user(self):
        # create user data and init client class
        user = dict(username='newuser', password1='pass', password2='pass', email='new@user.com', agreement=True)
        user_fail = dict(username='newuser', password1='pass', password2='pss', email='new@user.com', agreement=True)
        client = self.client_class()

        self.assertIsNone(get_user_model().objects.filter(email=user['email']).last())

        # Try register failed user data
        response = self.call_registration(user_fail)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            ''.join(response.context_data['form'].errors.get('password2', [])),
            'The two password fields didn\'t match.'
        )

        # Try register user without data
        response = self.call_registration(None)
        self.assertEqual(response.status_code, 200)
        self.assertListEqual(
            list(response.context_data['form'].errors.keys()),
            ['username', 'email', 'password1', 'password2', 'agreement']
        )

        # Correct registration request
        response = self.call_registration(user)
        self.assertRedirects(response, self.login_url)

        self.assertCount(mail.outbox, 1)
        regex = r"http(s)?:\/\/.*\/registration\/(\?.*?(?=\")){0,1}"
        match = re.search(regex, mail.outbox[-1].alternatives[-1][0], re.MULTILINE)
        href = match.group(0)

        href_base, correct_uid = href.split('uid=')
        user['uid'] = 'wrong'

        response = client.post(href_base, user)
        self.assertEqual(response.status_code, 400)

        # Check email and uid in create method
        secure_pickle = SecurePickling(settings.SECRET_KEY)
        fail_check_email_user = user.copy()
        fail_check_email_user['email'] = 'new_random_changed@email.com'
        cache_key_unhashed = 'not_correct@email.com'
        cache_key_hashed = make_password(cache_key_unhashed)

        cache.set(cache_key_hashed, secure_pickle.dumps(fail_check_email_user))
        fail_check_email_user['uid'] = cache_key_hashed
        response = client.post(href_base, fail_check_email_user)
        self.assertEqual(response.status_code, 400)

        # Success registration
        user['uid'] = correct_uid
        response = client.post(href, user)
        self.assertRedirects(response, self.login_url, target_status_code=302)

        get_user_model().objects.filter(email=user['email']).delete()
        response = client.post(href, {'uid': user['uid']})
        self.assertRedirects(response, self.login_url, target_status_code=302)

        client.post(self.logout_url)
        client.get(href)
        response = client.post(href, user)
        self.assertEqual(response.status_code, 200)

    def test_terms_agreement(self):
        user = dict(username='newuser', password1='pass', password2='pass', email='new@user.com', agreement=True)
        user_fail = dict(username='newuser', password1='pass', password2='pass', email='new@user.com')
        client = self.client_class()

        lang_text_data = {
            'ru': 'лицензионное соглашение',
            'en': 'terms of agreement',
            'cn': '协议条款',
            'vi': 'các điều khoản của thỏa thuận'
        }
        # Correct registration request returns redirect
        response = self.call_registration(user)
        self.assertRedirects(response, self.login_url)

        # Try registration without agreement returns error
        response = self.call_registration(user_fail)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.context_data['form'].errors['agreement'][0],
            'To continue, need to accept the terms agreement.'
        )

        # If ENABLE_AGREEMENT_TERMS=False, registration without agreement returns redirect
        with override_settings(ENABLE_AGREEMENT_TERMS=False):
            response = self.call_registration(user_fail)
            self.assertRedirects(response, self.login_url)

        # Response with 'lang=en' returns default 'terms.md' with correct html
        with utils.tmp_file(data='## test_header', encoding='utf8') as md_file:
            with override_settings(AGREEMENT_TERMS_PATH=md_file.path):
                response = self.client.get(reverse('terms') + f'?lang=en')

                self.assertEqual(response.status_code, 200)
                self.assertTemplateUsed(response, 'registration/terms.html')
                self.assertContains(response, '<h2>test_header</h2>')

        # Response with different languages returns different terms
        for item in lang_text_data.items():
            with utils.tmp_file(data=f'## {item[1]}', encoding='utf8', suffix=f'.{item[0]}') as md_file:
                with override_settings(AGREEMENT_TERMS_PATH=f'/tmp/{Path(md_file.path).stem}'):

                    response_with_en_lang = self.client.get(reverse('terms') + f'?lang={item[0]}')
                    self.assertEqual(response_with_en_lang.status_code, 200)
                    self.assertContains(response_with_en_lang, f'<h2>{item[1]}</h2>')

    @override_settings(SEND_CONFIRMATION_EMAIL=False, AUTHENTICATE_AFTER_REGISTRATION=False)
    def test_register_new_user_without_confirmation(self):
        user = dict(username='newuser', password1='pass', password2='pass', email='new@user.com', agreement=True)
        user_fail = dict(username='newuser', password1='pass', password2='pss', email='new@user.com', agreement=True)
        client = self.client_class()
        response = client.post(self.login_url, {'username': user['username'], 'password': user['password1']})
        self.assertEqual(response.status_code, 200)
        response = self.call_registration(user_fail)
        self.assertEqual(response.status_code, 200)
        response = self.call_registration(user)
        self.assertRedirects(response, self.login_url)
        response = client.post(self.login_url, {'username': user['username'], 'password': user['password2']})
        self.assertRedirects(response, '/')

    def test_login_redirects(self):
        user = self._create_user(is_super_user=False)
        client = self.client_class()
        redirect_page = '/#/user/1/notification_settings'

        # Test that login POST handler redirects after successful login
        response = client.post(self.login_url, {
            'username': user.data['username'],
            'password': user.data['password'],
            'next': redirect_page
        })
        self.assertRedirects(response, redirect_page)

    @override_settings(MAX_TFA_ATTEMPTS=4)
    def test_2fa(self):
        secret = 'base32secret3232'
        pin = '492039'
        with self.patch('pyotp.TOTP.verify') as mock_obj:
            mock_obj.side_effect = lambda x: x == pin
            results = self.bulk([
                # [0] check disabled
                {'method': 'get', 'path': ['user', 'profile', 'twofa']},

                # [1] setup 2fa
                {'method': 'put', 'path': ['user', 'profile', 'twofa'], 'data': {
                    'secret': secret, 'pin': pin, 'recovery': 'code1,,,,',
                }},
                # [2] check enabled
                {'method': 'get', 'path': ['user', 'profile', 'twofa']},

                # [3] disable 2fa
                {'method': 'put', 'path': ['user', 'profile', 'twofa'], 'data': {}},
                # [4] check disabled
                {'method': 'get', 'path': ['user', 'profile', 'twofa']},

                # [5] setup 2fa with wrong pin
                {'method': 'put', 'path': ['user', 'profile', 'twofa'], 'data': {'secret': secret, 'pin': '1337'}},
                # [6] check disabled
                {'method': 'get', 'path': ['user', 'profile', 'twofa']},

                # [7] setup 2fa with no secret
                {'method': 'put', 'path': ['user', 'profile', 'twofa'], 'data': {'pin': '1337'}},
                # [8] check disabled
                {'method': 'get', 'path': ['user', 'profile', 'twofa']},


                # [9] enable 2FA with recovery codes
                {'method': 'put', 'path': ['user', 'profile', 'twofa'], 'data': {
                    'secret': secret, 'pin': pin, 'recovery': 'co-de1,,,,cod-e2,,,,'
                }},

            ])
            self.assertEqual(mock_obj.call_count, 3)

        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data'], {'enabled': False})

        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data'], {'enabled': True})
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data'], {'enabled': True})

        self.assertEqual(results[3]['status'], 200)
        self.assertEqual(results[3]['data'], {'enabled': False})
        self.assertEqual(results[4]['status'], 200)
        self.assertEqual(results[4]['data'], {'enabled': False})

        self.assertEqual(results[5]['status'], 400)
        self.assertEqual(results[5]['data'], ['Invalid authentication code'])
        self.assertEqual(results[6]['status'], 200)
        self.assertEqual(results[6]['data'], {'enabled': False})

        self.assertEqual(results[7]['status'], 400)
        self.assertEqual(results[7]['data'], ['Secret string must be provided'])
        self.assertEqual(results[8]['status'], 200)
        self.assertEqual(results[8]['data'], {'enabled': False})

        self.assertEqual(results[9]['status'], 200)
        self.assertEqual(results[9]['data'], {'enabled': True})
        self.assertEqual(self.user.twofa.recoverycode.all().count(), 2)

        # Check logout after invalid attempts
        client = self.client_class()
        client.post(self.login_url, data=self.user.data)
        with self.patch('pyotp.TOTP.verify') as mock_obj:
            mock_obj.side_effect = lambda x: x == pin
            # Make 3 attempts with invalid pin
            client.post(self.login_url, data={'pin': '111'})
            client.post(self.login_url, data={'pin': '111'})
            response = client.post(self.login_url, data={'pin': '111'})
            # Check that response contains error message
            self.assertContains(response, 'Invalid authentication code')
            # Make 4th attempt
            response = client.post(self.login_url, data={'pin': '111'})
            # Check that login page returned
            self.assertContains(response, 'Sign in to start your session')

        # Check recovery codes
        client = self.client_class()
        client.post(self.login_url, data=self.user.data)
        response = client.post(self.login_url, data={'pin': 'cod-e2'})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.user.twofa.recoverycode.all().count(), 1)
        response = client.get('/')
        self.assertEqual(response.status_code, 200)

        # Check login and redirects
        client = self.client_class()
        client.post(self.login_url, data=self.user.data)
        self.assertTrue(settings.SESSION_COOKIE_NAME in client.cookies)

        response = client.get('/')
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, self.login_url)

        with self.patch('pyotp.TOTP.verify') as mock_obj:
            mock_obj.side_effect = lambda x: x == pin
            response = client.post(self.login_url, data={'pin': pin})
            self.assertEqual(response.status_code, 302)

        response = client.get('/')
        self.assertEqual(response.status_code, 200)

    def test_user_settings(self):
        initial_settings = {'custom': {}, 'main': {'dark_mode': False, 'language': 'en'}}
        custom_settings = {'custom': {'key1': 'val1'}, 'main': {'dark_mode': False, 'language': 'en'}}
        updated_settings = {'custom': {}, 'main': {'dark_mode': True, 'language': 'en'}}
        wrong_settings = {'custom': {}, 'main': {'dark_mode': 'SOME ERROR', 'language': 'en'}}

        results = self.bulk([
            # [0] Get request to user with no settings
            {'method': 'get', 'path': '/user/profile/_settings/'},
            # [1] Update settings
            {'method': 'put', 'path': '/user/profile/_settings/', 'data': updated_settings},
            # [2] Get updated settings
            {'method': 'get', 'path': '/user/profile/_settings/'},

            # [3] If completely wrong data sent, default value will be set
            {'method': 'put', 'path': '/user/profile/_settings/', 'data': ''},
            # [4] Check that settings did not change
            {'method': 'get', 'path': '/user/profile/_settings/'},

            # [5] If wrong value sent, error will be returned
            {'method': 'put', 'path': '/user/profile/_settings/', 'data': wrong_settings},
            # [6] Check that settings did not change
            {'method': 'get', 'path': '/user/profile/_settings/'},

            # [7] Set custom settings
            {'method': 'put', 'path': '/user/profile/_settings/', 'data': custom_settings},
            # [8] Check that custom settings set
            {'method': 'get', 'path': '/user/profile/_settings/'},


        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data'], initial_settings)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data'], updated_settings)
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data'], updated_settings)
        self.assertEqual(results[3]['status'], 200)
        self.assertEqual(results[3]['data'], initial_settings)
        self.assertEqual(results[4]['status'], 200)
        self.assertEqual(results[4]['data'], initial_settings)
        self.assertEqual(results[5]['status'], 400)
        self.assertEqual(results[5]['data'], {'main': {'dark_mode': ['Must be a valid boolean.']}})
        self.assertEqual(results[6]['status'], 200)
        self.assertEqual(results[6]['data'], initial_settings)
        self.assertEqual(results[7]['status'], 200)
        self.assertEqual(results[7]['data'], custom_settings)
        self.assertEqual(results[8]['status'], 200)
        self.assertEqual(results[8]['data'], custom_settings)

        # Request with lang parameter
        with self.user_as(self, self._create_user()):
            response = self.get_result('get', '/api/v1/user/profile/_settings/?lang=ru', relogin=True)
        self.assertEqual(response['main']['language'], 'ru')


class DefaultBulkTestCase(BaseTestCase):

    def test_bulk(self):
        self.get_model_filter(
            'django.contrib.auth.models.User'
        ).exclude(pk=self.user.id).delete()
        data = [
            dict(username="USER{}".format(i), password="123", password2='123')
            for i in range(10)
        ]
        users_id = self.mass_create('/api/v1/user/', data, 'username')
        test_user = dict(username=self.random_name(), password='123', password2='123')
        userself_data = dict(first_name='me')
        bulk_request_data = [
            # Check code 204
            dict(method='delete', path=['user', users_id[0]]),
            # Check code 404
            dict(method='delete', path=['user', 0]),
            # Check 201 and username
            dict(method='post', path='user', data=test_user),
            # Check update first_name by self
            dict(method='patch', path=['user', self.user.id], data=userself_data),
            # Check mods to view detail
            dict(method="get", path=['settings', 'system']),
            # Check bulk-filters
            dict(method='get', path='user', query='id=' + ','.join(str(i) for i in users_id)),
            # Check `__init__` mod as default
            dict(method="get", path=["settings", "system"]),
            dict(method="get", path=["user", self.user.id]),
            dict(method="get", path=["user"]),
            # Check json in data fields
            dict(
                method="post",
                path=['user'],
                data=dict(
                    username='ttt',
                    password='ttt333',
                    password2='ttt333',
                    first_name=json.dumps(dict(some='json'))
                )),
            dict(method='get', path=['usr', self.user.id])
        ]
        self.bulk_transactional(bulk_request_data, 502)
        self.client.post(f'{self.login_url}?lang=ru', self.user.data)
        result = self.bulk(bulk_request_data, HTTP_ACCEPT_LANGUAGE='ru,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7,es;q=0.6', relogin=False)
        self._logout(self.client)

        self.assertEqual(result[0]['status'], 204)
        self.assertEqual(result[1]['status'], 404)
        self.assertEqual(result[1]['data']['detail'], 'Ни один Пользователь не соответствует данному запросу.')
        self.assertEqual(result[2]['status'], 201)
        self.assertEqual(result[2]['data']['username'], test_user['username'])
        self.assertEqual(result[3]['status'], 200)
        self.assertEqual(result[3]['data']['first_name'], userself_data['first_name'])
        self.assertEqual(result[4]['status'], 200)
        self.assertEqual(result[4]['data']['PY'], self.settings_obj.PY_VER)
        self.assertEqual(result[5]['status'], 200)
        self.assertEqual(result[5]['data']['count'], len(users_id) - 1)
        self.assertEqual(result[6]['status'], 200)
        self.assertEqual(result[6]['data']['PY'], self.settings_obj.PY_VER)
        self.assertEqual(result[7]['status'], 200)
        self.assertEqual(result[7]['data']['id'], self.user.id)
        self.assertEqual(result[8]['status'], 200)
        self.assertEqual(result[9]['status'], 201, result[9])
        self.assertEqual(result[10]['status'], 404, result[10])

        # Test linked bulks
        self.get_model_filter(
            'django.contrib.auth.models.User'
        ).exclude(pk=self.user.id).delete()
        bulk_request_data = [
            # Check 201 and username
            dict(method='post', path='user', data=test_user),
            # Get details from link
            dict(method='get', path=['user', '<<0[data][id]>>']),
            dict(method='get', path='user', query='id=<<1[data][id]>>')
        ]
        result = self.get_result(
            "post", "/api/endpoint/", 200, data=json.dumps(bulk_request_data)
        )
        self.assertEqual(result[0]['status'], 201)
        self.assertEqual(result[0]['data']['username'], test_user['username'])
        self.assertEqual(result[1]['status'], 200)
        self.assertEqual(result[1]['data']['username'], test_user['username'])


class OpenapiEndpointTestCase(BaseTestCase):

    @override_settings(CENTRIFUGO_CLIENT_KWARGS={
        'address': 'https://localhost:8000',
        'api_key': "XXX",
        'token_hmac_secret_key': "YYY"
    }, CENTRIFUGO_PUBLIC_HOST='https://public:8000')
    def test_get_openapi(self):
        api = self.endpoint_schema()

        # Check project title
        self.assertEqual(api['info']['title'], 'Example Project')

        # Check Centrifugo settings
        self.assertEqual(api['info']['x-centrifugo-address'], "wss://public:8000")
        self.assertIn('x-centrifugo-token', api['info'])

        # Check docs info
        self.assertDictEqual(api['info']['x-docs'], {'has_docs': True, 'docs_url': '/docs/'})
        # Check links info
        self.assertDictEqual(
            api['info']['x-links'],
            {'vstutils': {'name': 'VST Utils sources', 'url': 'https://github.com/vstconsulting/vstutils.git'}}
        )
        # Check user id
        self.assertEqual(api['info']['x-user-id'], self.user.id)
        # Check gui menu
        self.assertEqual(api['info']['x-menu'], self.settings_obj.PROJECT_GUI_MENU)

        # Check if schema has basic attributes
        self.assertTrue('basePath' in api, api.keys())
        self.assertEqual(api['basePath'], self.get_url()[:-1])
        self.assertTrue('paths' in api, api.keys())
        self.assertTrue('host' in api, api.keys())
        self.assertEqual(api['host'], self.server_name)
        self.assertTrue('definitions' in api, api.keys())
        self.assertTrue('schemes' in api, api.keys())
        self.assertEqual(api['schemes'], ['https'])
        self.assertTrue('application/json' in api['consumes'], api['consumes'])
        self.assertTrue('application/json' in api['produces'], api['produces'])

        # test generated fields produce same fields in schema as manually overriden
        self.assertDictEqual(
            api['definitions']['ModelWithBinaryFiles']['properties'],
            api['definitions']['OverridenModelWithBinaryFiles']['properties']
        )
        # Test swagger ui
        client = self._login()
        response = client.get('/api/endpoint/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'drf-yasg/swagger-ui.html')
        with self.assertRaises(ValueError):
            json.loads(response.content.decode('utf-8'))

    def test_openapi_schema_content(self):
        api = self.endpoint_schema()
        img_res_validator_data = {
                    'min_width': 200,
                    'max_width': 600,
                    'min_height': 200,
                    'max_height': 600,
                    'extensions': [
                        'jpg'
                    ],
                }
        # Checking versions list
        self.assertIn('application', api['info']['x-versions'])
        self.assertIn('library', api['info']['x-versions'])
        self.assertIn('vstutils', api['info']['x-versions'])
        self.assertIn('django', api['info']['x-versions'])
        self.assertIn('djangorestframework', api['info']['x-versions'])
        self.assertIn('drf_yasg', api['info']['x-versions'])

        # Checking generated view correct schema
        self.assertIn('Author', api['definitions'])
        self.assertIn('OneAuthor', api['definitions'])
        self.assertIn('UpdateAuthor', api['definitions'])
        # id must appears if it not set in meta-attributes
        self.assertIn('id', api['definitions']['Author']['properties'])
        self.assertIn('id', api['definitions']['OneAuthor']['properties'])
        # Grouping model properties for GUI
        self.assertEqual(
            api['definitions']['OneAuthor']['x-properties-groups'],
            {'Main': ['id', 'name'], '': ['registerDate', 'posts']}
        )
        # Check view field name
        self.assertEqual(api['definitions']['OneExtraPost']['x-view-field-name'], 'title')
        self.assertEqual(api['definitions']['OneAuthor']['x-view-field-name'], 'name')
        self.assertEqual(api['definitions']['OneAuthor']['x-non-bulk-methods'], ['post'])
        self.assertEqual(api['definitions']['OneVariable']['x-view-field-name'], 'key')
        self.assertEqual(api['definitions']['OneUser']['x-view-field-name'], 'username')
        self.assertEqual(api['definitions']['OneList']['x-view-field-name'], 'value')
        self.assertEqual(api['definitions']['ModelWithBinaryFiles']['x-view-field-name'], 'some_namedbinfile')
        self.assertEqual(api['definitions']['UpdateAuthor']['x-view-field-name'], 'id')
        self.assertEqual(api['definitions']['UpdateAuthor']['x-non-bulk-methods'], '*')

        hidden_param = [i for i in api['paths']['/author/']['get']['parameters'] if i['name'] == 'hidden'][0]
        self.assertEqual(hidden_param['type'], 'boolean')

        # Checking generated view correct schema
        self.assertIn('ExtraPost', api['definitions'])
        self.assertIn('OneExtraPost', api['definitions'])
        # Check propery format for FkModelField
        self.assertEqual(api['definitions']['ExtraPost']['properties']['author']['format'], 'fk')
        self.assertEqual(
            api['definitions']['ExtraPost']['properties']['author']['additionalProperties']['model']['$ref'],
            '#/definitions/Author'
        )
        # Check properly format for RelatedListField
        self.assertEqual(api['definitions']['OneAuthor']['properties']['posts']['type'], 'string')
        self.assertEqual(api['definitions']['OneAuthor']['properties']['posts']['format'], 'related_list')
        self.assertEqual(api['definitions']['OneAuthor']['properties']['posts']['additionalProperties']['viewType'], 'table')
        # Check properly format for RatingField
        self.assertEqual(
                api['definitions']['OneExtraPost']['properties']['rating'],
                {
                    'title': 'Rating',
                    'type': 'number',
                    'format': 'rating',
                    'additionalProperties': {
                        'min_value': 0,
                        'max_value': 10,
                        'step': 1,
                        'style': 'slider',
                        'color': 'red',
                        'fa_class': None,
                    }
                }
            )
        self.assertEqual(
            api['definitions']['OneExtraPost']['properties']['fa_icon_rating'],
            {
                'title': 'Fa icon rating',
                'type': 'number',
                'format': 'rating',
                'additionalProperties': {
                    'min_value': 0,
                    'max_value': 5,
                    'step': 1,
                    'style': 'fa_icon',
                    'color': None,
                    'fa_class': 'fas fa-cat'
                }
            }
        )
        # Check properly format for NamedBinaryImageInJsonField
        self.assertDictEqual(
            api['definitions']['ModelWithBinaryFiles']['properties']['some_namedbinimage'],
            {
                'title': 'Some namedbinimage',
                'type': 'string',
                'format': 'namedbinimage',
                'additionalProperties': {},
            }
        )
        self.assertDictEqual(
                api['definitions']['ModelWithBinaryFiles']['properties']['some_validatednamedbinimage']['additionalProperties'],
                img_res_validator_data
            )
        # Check properly format for MultipleNamedBinaryImageInJsonField
        self.assertDictEqual(
            api['definitions']['ModelWithBinaryFiles']['properties']['some_validatedmultiplenamedbinimage']['additionalProperties'],
            img_res_validator_data
        )
        # Check default fields grouping
        self.assertEqual(api['definitions']['ExtraPost']['x-properties-groups'], {"": ['id', 'author', 'title']})

        # Checking correct `x-subscribe-labels` for Centrifugo subscriptions
        self.assertEqual(api['paths']['/author/']['get']['x-subscribe-labels'], ['test_proj.Author'])
        self.assertEqual(api['paths']['/author/{id}/']['get']['x-subscribe-labels'], ['test_proj.Author'])
        # Check it for Proxy models
        self.assertEqual(api['paths']['/author/{id}/post/']['get']['x-subscribe-labels'],
                         ['test_proj.ExtraPost', 'test_proj.Post'])
        self.assertEqual(api['paths']['/author/{id}/post/{post_id}/']['get']['x-subscribe-labels'],
                         ['test_proj.ExtraPost', 'test_proj.Post'])

        # Check correct nested schema generation
        sub_path = '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/shost/'
        # Check `x-allow-append` label for nested POST-method
        self.assertTrue(api['paths'][sub_path]['post']['x-allow-append'])

        self.assertEqual(api['paths'][sub_path]['get']['x-subscribe-labels'], ['test_proj.Host'])
        sub_path = '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/hosts/'
        self.assertFalse(api['paths'][sub_path]['post']['x-allow-append'])
        self.assertEqual(api['paths'][sub_path]['get']['x-subscribe-labels'], ['test_proj.Host'])

        self.assertEqual(api['paths']['/subhosts/']['get']['x-subscribe-labels'], ['test_proj.Host'])
        self.assertEqual(api['paths']['/hosts/{id}/hosts/']['get']['x-subscribe-labels'], ['test_proj.Host'])
        self.assertTrue(api['paths']['/hosts/{id}/hosts/{hosts_id}/test/']['post']['x-multiaction'])
        self.assertEqual(api['paths']['/hosts/{id}/']['get']['x-subscribe-labels'], ['test_proj.HostGroup'])

        # Test list only view
        self.assertIn('/hosts_list/', api['paths'])
        self.assertNotIn('/hosts_list/{id}/', api['paths'])
        hosts_list = api['paths']['/hosts_list/']
        self.assertNotIn('post', hosts_list)
        self.assertNotIn('delete', hosts_list)
        self.assertNotIn('patch', hosts_list)
        self.assertNotIn('put', hosts_list)

        # Check depend fields
        self.assertEqual(api['definitions']['Variable']['properties']['key']['format'], 'fk')
        self.assertEqual(
            api['definitions']['Variable']['properties']['key']['additionalProperties'],
            {
                'makeLink': True,
                'model': {'$ref': '#/definitions/VariableType'},
                'usePrefetch': True,
                'value_field': 'id',
                'view_field': 'name',
                'dependence': None,
                'filters': None
            }
        )
        self.assertEqual(
            api['definitions']['OneModelWithFK']['properties']['fk_with_filters']['additionalProperties']['filters'],
            {'rating': 5}
        )
        self.assertEqual(api['definitions']['Variable']['properties']['value']['format'], 'dynamic_fk')
        self.assertEqual(
            api['definitions']['Variable']['properties']['value']['additionalProperties'],
            {"field": 'key', 'field_attribute': 'val_type'}
        )

        # Check that's schema is correct and fields are working
        host_obj = self.get_model_class('test_proj.HostList').objects.create(name='123')
        results = self.bulk([
            {'method': 'post', 'path': ['author'], 'data': dict(name="Some author")},
            {'method': 'post', 'path': ['author', '<<0[data][id]>>', 'post'], 'data': dict(title="title", text='txt')},
            {'method': 'get', 'path': ['author', '<<0[data][id]>>', 'post']},
            {'method': 'get', 'path': ['hosts_list']},
            {'method': 'get', 'path': ['hosts_list', host_obj.id]},
            {'method': 'patch', 'path': ['author', '<<0[data][id]>>'], 'data': dict(name="Update name")},
        ])

        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['count'], 1)
        self.assertEqual(results[3]['status'], 200)
        self.assertEqual(results[3]['data']['count'], self.get_model_filter('test_proj.HostList').count())
        self.assertEqual(results[4]['status'], 404)
        self.assertEqual(results[5]['status'], 200)
        self.assertEqual(tuple(results[5]['data'].keys()), ('id', 'name', 'hidden'))

        # Check models docstrings as description
        self.assertEqual(
            api['paths']['/testcontenttype/{id}/']['get']['description'],
            'Return an variable-based instance.'
        )
        self.assertEqual(
            api['paths']['/testcontenttype/']['post']['description'],
            'Create new model based on variables.'
        )
        self.assertEqual(
            api['paths']['/testcontenttype/']['get']['description'],
            'Variables based model.'
        )
        self.assertEqual(
            api['paths']['/listoffiles/{id}/']['get']['responses']['200']['schema'],
            {'type': 'file'}
        )

        # Check MultipleFileField and MultipleImageField serializer mapping in schema
        self.assertEqual('multiplenamedbinfile', api['definitions']['OverridenModelWithBinaryFiles']['properties']['some_multiplefile']['format'])
        self.assertEqual('multiplenamedbinimage', api['definitions']['OverridenModelWithBinaryFiles']['properties']['some_multipleimage']['format'])

        # Check deep nested view
        def has_deep_parent_filter(params):
            return any(filter(
                lambda x: x['name'] == '__deep_parent' and x['in'] == 'query' and x['type'] == 'integer',
                params,
            ))
        self.assertTrue(has_deep_parent_filter(api['paths']['/deep_nested_model/']['get']['parameters']))
        self.assertEqual(api['paths']['/deep_nested_model/']['get']['x-deep-nested-view'], 'deepnested')
        self.assertEqual(api['paths']['/deep_nested_model/{id}/']['get']['x-deep-nested-view'], 'deepnested')
        self.assertTrue(api['paths']['/deep_nested_model/{id}/deepnested/']['post']['x-allow-append'])

        self.assertTrue(has_deep_parent_filter(api['paths']['/readonly_deep_nested_model/']['get']['parameters']))
        self.assertNotIn('/readonly_deep_nested_model/{id}/readonly_deepnested/', api['paths'])

        # Check fields excludes from the filterset
        path = api['paths']['/test_json_file_image_fields_model/']['get']

        # fields existing in the model 'ModelForCheckImageAndFileFields'
        fields_of_model_list = [
            'some_image_field',
            'some_file_field',
            'some_multiple_image_field',
            'some_multiple_file_field',
            'some_json_field',
        ]
        fields_name_mapping = [field.attname for field in ModelForCheckFileAndImageField._meta.fields]
        # Check fields in model
        for field_name in fields_of_model_list:
            self.assertIn(field_name, fields_name_mapping)

        # Check fields not in filterset_fields
        fields_in_filterset_list = [i['name'] for i in path['parameters']]
        for field_name in fields_in_filterset_list:
            self.assertNotIn(field_name, fields_of_model_list)

        # Check RedirectFieldMixin's schema
        self.assertDictEqual(api['definitions']['Host']['properties']['id']['additionalProperties']['redirect'], {
            'operation_name': 'files',
            'depend_field': None,
            'concat_field_name': False,
        })

    def test_api_version_request(self):
        api = self.get_result('get', '/api/endpoint/?format=openapi&version=v2', 200)
        paths_which_is_tech = (r'settings', r'_lang')

        valid_paths = [
            f'/{y}/'
            for y in self.settings_obj.API['v2'].keys()
            if y not in paths_which_is_tech
        ]

        # Check paths which should not appears
        invalid_paths = [
            p
            for p in api['paths']
            if list(filter(p.startswith, valid_paths)) == []
        ]
        self.assertFalse(invalid_paths, invalid_paths)

        # Check path which is not appears but should be
        invalid_paths = [
            p
            for p in valid_paths
            if p not in api['paths']
        ]
        self.assertFalse(invalid_paths, invalid_paths)

    def test_openapi_hooks(self):
        OPENAPI_HOOKS = [
            # valid hook
            'test_proj.openapi.hook1',
            # invalid hook
            'test_proj.openapi.hook3',
            # valid hook
            'test_proj.openapi.hook2',
            # nonexistent hook
            'test_proj.openapi.hook4',
            # valid hook
            'test_proj.openapi.hook5'
        ]
        with override_settings(OPENAPI_HOOKS=OPENAPI_HOOKS):
            api = self.endpoint_schema()
        self.assertEqual(api['info']['x-check-1'], 1)
        self.assertEqual(api['info']['x-check-2'], 2)
        with override_settings(OPENAPI_HOOKS=OPENAPI_HOOKS):
            with self.user_as(self, self._create_user(is_super_user=False)):
                api1_user = self.endpoint_schema()
        self.assertEqual(api['info']['x-check-5'], 5)
        self.assertEqual(api1_user['info'].get('x-check-5'), None)

    def test_sync_email_sending(self):
        from vstutils.utils import send_template_email
        with self.assertRaises(TypeError):
            send_template_email(
                sync=True,
                template_name='registration/confirm_email.html',
                subject='Test',
            )
        self.assertCount(mail.outbox, 0)

        with self.assertRaises(TemplateDoesNotExist):
            send_template_email(
                sync=True,
                template_name='yololo',
                subject='qwe',
                email='ctulhu@fhtagn.deep',
                context_data=[(1, 2), (3, 4)]
            )
        self.assertCount(mail.outbox, 0)

        subj = 'Test'
        send_template_email(
            sync=True,
            template_name='test_tmplt.html',
            subject=subj,
            email='ctulhu@fhtagn.deep',
            context_data=[('first', 2), ('second', 4)]
        )
        self.assertCount(mail.outbox, 1)
        self.assertEqual(mail.outbox[-1].subject, subj)
        self.assertEqual(mail.outbox[-1].alternatives[0][0], '2 4')
        self.assertEqual(mail.outbox[-1].alternatives[0][1], 'text/html')

        send_template_email(
            sync=True,
            template_name='test_tmplt.html',
            subject='',
            email='ctulhu@fhtagn.deep',
            context_data=[('first', 2), ('second', 4)]
        )
        self.assertCount(mail.outbox, 2)
        self.assertEqual(mail.outbox[-1].subject, '')
        self.assertEqual(mail.outbox[-1].alternatives[0][0], '2 4')
        self.assertEqual(mail.outbox[-1].alternatives[0][1], 'text/html')

        send_template_email(
            sync=True,
            template_name='test_tmplt.html',
            subject='',
            email='ctulhu@fhtagn.deep',
            context_data={'first': 2, 'second': 4}
        )
        self.assertCount(mail.outbox, 3)
        self.assertEqual(mail.outbox[-1].subject, '')
        self.assertEqual(mail.outbox[-1].alternatives[0][0], '2 4')
        self.assertEqual(mail.outbox[-1].alternatives[0][1], 'text/html')

        send_template_email(
            sync=True,
            template_name='test_tmplt.html',
            subject='',
            email='ctulhu@fhtagn.deep',
            context_data={}
        )
        self.assertCount(mail.outbox, 4)
        self.assertEqual(mail.outbox[-1].subject, '')
        self.assertEqual(mail.outbox[-1].alternatives[0][0], ' ')
        self.assertEqual(mail.outbox[-1].alternatives[0][1], 'text/html')

        send_template_email(
            sync=True,
            template_name='test_tmplt.html',
            subject=subj,
            email='ctulhu@fhtagn.deep',
            context_data=None
        )
        self.assertCount(mail.outbox, 5)
        self.assertEqual(mail.outbox[-1].subject, 'Test')
        self.assertEqual(mail.outbox[-1].alternatives[0][0], ' ')
        self.assertEqual(mail.outbox[-1].alternatives[0][1], 'text/html')

    def test_async_mail_send_retries(self):
        from vstutils.tasks import SendEmailMessage

        def raise_smtp_exc(*args, **kwargs):
            raise SMTPException()

        def raise_and_success(*args, **kwargs):
            if kwargs['additional']['count'] < 3:
                kwargs['additional']['count'] += 1
                raise SMTPException()
            return 1

        with patch('vstutils.utils.send_mail') as mock_send:
            mock_send.side_effect = raise_and_success
            SendEmailMessage.do(
                email_from=settings.EMAIL_FROM_ADDRESS,
                template_name='test_tmplt.html',
                subject='',
                email='ctulhu@fhtagn.deep',
                context_data={},
                additional={
                    'count': 0,
                },
            )
            self.assertEqual(mock_send.call_count, 4)
            mock_send.reset_mock()
            mock_send.side_effect = raise_smtp_exc
            SendEmailMessage.do(
                email_from=settings.EMAIL_FROM_ADDRESS,
                template_name='test_tmplt.html',
                subject='',
                email='ctulhu@fhtagn.deep',
                context_data={},
                additional={
                    'count': 0,
                },
            )
            self.assertEqual(mock_send.call_count, 11)


class EndpointTestCase(BaseTestCase):

    def test_auth(self):
        # Check public schema access
        result = self.get_result('get', '/api/endpoint/?format=openapi', relogin=False)
        self.assertEqual(result['info']['x-user-id'], None)

        user = self._create_user()
        auth_str = b64encode(f'{user.data["username"]}:{user.data["password"]}'.encode()).decode('ascii')
        basic_client = self.client_class(HTTP_AUTHORIZATION=f'Basic {auth_str}')
        response = basic_client.put('/api/endpoint/')
        self.assertEqual(response.status_code, 200)

        response = basic_client.put('/api/endpoint/', json.dumps({
            'path': '/request_info/',
            'version': 'v2',
            'method': 'get'
        }), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        result = self.render_api_response(response)
        self.assertEqual(result[0]['data']['user_id'], user.id, result)

    def test_simple_queries(self):
        User = self.get_model_class('django.contrib.auth.models.User')
        User.objects.exclude(pk=self.user.id).delete()

        user1 = User.objects.first()

        user_attrs_detail = ['email', 'first_name', 'id', 'is_active', 'is_staff', 'last_name', 'username']
        user_attrs_list = ['email', 'id', 'is_active', 'is_staff', 'username']
        user_from_db_to_user_from_api_detail = lambda db_user: {key: getattr(db_user, key) for key in user_attrs_detail}
        user_from_db_to_user_from_api_list = lambda db_user: {key: getattr(db_user, key) for key in user_attrs_list}

        # Get 1 user
        request = [
            {
                'path': ['user', user1.id],
                'method': 'get'
            }
        ]
        response = self.get_result('put', '/api/endpoint/', 200, data=json.dumps(request))

        self.assertEqual(len(request), len(response))
        self.assertEqual('GET', response[0]['method'])
        self.assertEqual('/api/v1/user/1/', response[0]['path'])
        self.assertEqual(200, response[0]['status'])
        # self.assertEqual('v1', response[0]['version'])

        expected_user = user_from_db_to_user_from_api_detail(user1)
        actual_user = response[0]['data']
        self.assertDictEqual(expected_user, actual_user)

        # Create 2 users
        request = [
            dict(
                path='/user/',
                method='post',
                data=dict(username=f'USER{i}', password='123', password2='123'),
                version='v1'
            ) for i in range(10)
        ]
        response = self.get_result('put', '/api/endpoint/', 200, data=json.dumps(request))

        for idx, op in enumerate(request):
            user = User.objects.filter(username=op['data']['username']).first()
            self.assertEqual(201, response[idx]['status'])
            self.assertDictEqual(
                user_from_db_to_user_from_api_detail(user),
                response[idx]['data']
            )

        # Get all users
        request = [
            {
                'path': '/user/',
                'method': 'get',
                'query': 'limit=5'
            }
        ]
        response = self.get_result('put', '/api/endpoint/', 200, data=json.dumps(request))

        self.assertEqual(len(request), len(response))
        self.assertEqual('GET', response[0]['method'])
        self.assertEqual('/api/v1/user/?limit=5', response[0]['path'])
        self.assertEqual(200, response[0]['status'])
        # self.assertEqual('v1', response[0]['version'])

        response_users = response[0]['data']['results']

        self.assertEqual(5, len(response_users))

        for resp_user in response_users:
            user = User.objects.filter(id=resp_user['id']).first()
            self.assertDictEqual(
                user_from_db_to_user_from_api_list(user),
                resp_user
            )

        # Update user
        request = [
            dict(
                path=f'/user/{response_users[0]["id"]}/',
                method='patch',
                data=dict(first_name='Name 1'),
                version='v1'
            ),
            dict(
                path=f'/user/{response_users[1]["id"]}/',
                method='patch',
                data=dict(last_name='Name 2')
            )
        ]
        response = self.get_result('put', '/api/endpoint/', 200, data=json.dumps(request))

        self.assertEqual(2, len(response))

        for r in response:
            user = User.objects.filter(id=r['data']['id']).first()
            self.assertEqual(200, r['status'])
            self.assertDictEqual(
                user_from_db_to_user_from_api_detail(user),
                r['data']
            )

        # Invalid request
        request = [
            dict(
                path=f'/user/{response[0]["data"]["id"]}/',
                method='patch',
                data=dict(username=''),
                version='v1'
            ),
            dict(
                path=f'/user/{response[1]["data"]["id"]}/',
                method='patch',
                data=dict(last_name='Name' * 40)  # More than 150 characters
            ),
        ]
        response = self.get_result('put', '/api/endpoint/', 200, data=json.dumps(request))

        self.assertEqual(2, len(response))
        self.assertEqual(400, response[0]['status'])
        self.assertEqual(400, response[1]['status'])

        self.assertEqual(['This field may not be blank.'], response[0]['data']['username'])
        self.assertEqual(['Ensure this field has no more than 150 characters.'], response[1]['data']['last_name'])

        # Invalid bulk request
        response = self.get_result('put', '/api/endpoint/', 200, data=json.dumps([{}]))
        self.assertEqual(response[0]['status'], 500)
        self.assertEqual(response[0]['path'], 'bulk')
        self.assertEqual(
            response[0]['info'],
            {
                'errors': {
                    'path': ['This field is required.'],
                    'method': ['This field is required.']
                },
                'operation_data': {}
            }
        )

        # Test text api response 404
        request = [
            {
                'path': '/not_found/',
                'method': 'get',
            }
        ]
        response = self.get_result('put', '/api/endpoint/', 200, data=json.dumps(request))

        self.assertEqual(response[0]['status'], 404, response[0])
        self.assertTrue('<h1>Not Found</h1>' in response[0]['data']['detail'])

    def test_testing_tool(self):
        with self.assertRaises(AssertionError):
            self.get_model_class('SomeNotFound')
        self.assertEqual(self.get_model_class(File), File)

    def test_param_templates(self):
        Host.objects.all().delete()

        for i in range(10):
            Host.objects.create(name=f'test_{i}')

        request = [
            {
                'path': 'subhosts',
                'method': 'get'
            },
            # Template in path str
            {
                'path': ['/subhosts/<<0[data][results][9][id]>>/'],
                'method': 'patch',
                'data': {
                    'name': '5'
                }
            },
            {
                'path': 'subhosts',
                'method': 'get'
            },
            # Template in path list
            {
                'path': ['subhosts', '<<2[data][results][0][id]>>'],
                'method': 'get'
            },
            # Template in data
            {
                'path': ['subhosts', '<<2[data][results][1][id]>>'],
                'method': 'patch',
                'data': {
                    'name': '<<2[data][results][9][name]>>'
                }
            },
            # Template in query
            {
                'path': 'subhosts',
                'method': 'get',
                'query': 'limit=<<2[data][results][9][name]>>'
            },
            # Template in headers
            {
                'path': 'request_info',
                'method': 'get',
                'headers': {
                    'TEST_HEADER': '<<2[data][results][9][name]>>'
                },
                'version': 'v2'
            },
            # Non string data
            {
                'path': 'request_info',
                'method': 'put',
                'data': {
                    'integer': 1,
                    'float': 1.0,
                    'none': None,
                    'ordered': OrderedDict((('a', 1), ('b', 2))),
                    'list': [1, 2.0, '3']
                },
                'version': 'v2'
            }
        ]

        response = self.get_result('put', '/api/endpoint/', 200, data=json.dumps(request))

        self.assertEqual(response[1]['status'], 200)
        self.assertEqual(response[3]['status'], 200)
        self.assertEqual(response[3]['status'], 200)
        self.assertEqual(response[4]['status'], 200)
        self.assertEqual(response[4]['data'], {
            'filter_applied': 1,
            'id': 2,
            'local_filter_applied': 1,
            'name': 5,
            'string_filter_applied': True
        })
        self.assertEqual(len(response[5]['data']['results']), 5)
        self.assertEqual(response[6]['data']['headers']['TEST_HEADER'], 5)
        self.assertEqual(response[7]['data'], {
            'integer': 1,
            'float': 1.0,
            'none': None,
            'ordered': {'a': 1, 'b': 2},
            'list': [1, 2.0, '3']
        })

    def test_threaded_bulk(self):
        request_data = [
            {"method": "get", "path": ['user', self.user.id, 'test_bulk_perf'], 'version': 'v4'}
            for i in range(10)
        ]

        def iteration(method):
            results = self.endpoint_call(request_data, method=method)
            self.assertFalse(any(filter(lambda r: r['status'] != 200, results)), results)
            self.assertFalse(any(filter(lambda r: r['data']['id'] != self.user.id, results)))

            return method, self.last_response.headers['server-timing'][1].split(', ')[0].split('=')[-1]

        perf_results = '\n'.join(f'{k.upper()}: {v}ms' for k, v in map(iteration, ('post', 'put', 'patch')))
        print(f"\nTimings for different methods:\n{perf_results}\n")

    def test_transactional_bulk(self):
        request = [
            dict(
                path='/user/',
                method='post',
                data=dict(username='USER_123', password='123', password2='123')
            ),
            dict(
                path='/user/not_found_404',
                method='get'
            )
        ]
        response = self.get_result('post', '/api/endpoint/', 502, data=json.dumps(request))

        self.assertEqual(response[0]['status'], 201)
        self.assertEqual(response[0]['data']['username'], 'USER_123')
        self.assertEqual(response[1]['status'], 404)
        self.assertFalse(
            self.get_model_filter(
                'django.contrib.auth.models.User',
                pk=response[0]['data']['id']
            ).exists()
        )

        response = self.get_result('post', '/api/endpoint/', 200, data=json.dumps(request[:1]))
        self.assertEqual(response[0]['status'], 201)
        self.assertEqual(response[0]['data']['username'], 'USER_123')
        self.assertTrue(
            self.get_model_filter(
                'django.contrib.auth.models.User',
                pk=response[0]['data']['id']
            ).exists()
        )


class ValidatorsTestCase(BaseTestCase):
    valid_image_content_dict = {
        'name': 'cat.jpg',
        'content': get_file_value(os.path.join(DIR_PATH, 'image_b64_valid')),
    }
    invalid_image_content_dict = {
        'name': 'cat.jpg',
        'content': get_file_value(os.path.join(DIR_PATH, 'image_b64_invalid')),
    }

    def test_regexp_validator(self):
        regexp_validator = RegularExpressionValidator(re.compile(r'^valid$'))

        with self.assertRaises(ValidationError):
            regexp_validator('not valid')

        regexp_validator('valid')

    def test_lib_installed_check(self):
        with patch('vstutils.api.validators.ImageValidator.has_pillow', new_callable=PropertyMock) as mock_pillow:
            mock_pillow.return_value = False
            image_res_validator = ImageResolutionValidator(max_width=1280, max_height=720)
            image_open_validator = ImageOpenValidator()
            image_validator = ImageValidator()
            with self.assertWarns(ImportWarning):
                image_res_validator(self.valid_image_content_dict)
                image_open_validator(self.valid_image_content_dict)
                image_validator(self.valid_image_content_dict)
            mock_pillow.return_value = True
            image_validator(self.valid_image_content_dict)

    def test_image_validator(self):
        img_validator = ImageValidator(extensions=['jpg', ])

        # check wrong image extension
        with self.assertRaisesMessage(ValidationError, '[ErrorDetail(string=\'unsupported image file format,'
                                                       ' expected (jpg), got bmp\', code=\'invalid\')]'):
            img_validator({
                'name': 'cat.bmp',
                'content': 'cdef',
            })

        # check file with no extension
        with self.assertRaisesMessage(ValidationError, '[ErrorDetail(string=\'unsupported image file format,'
                                                       ' expected (jpg), got \', code=\'invalid\')]'):
            img_validator({
                'name': 'qwerty123',
                'content': 'abcd',
            })

    def test_image_open_validator(self):
        img_open_validator = ImageOpenValidator(extensions=['jpg', ])

        with self.assertRaises(ValidationError):
            img_open_validator(self.invalid_image_content_dict)

    def test_image_width_validator(self):
        img_width_validator = ImageWidthValidator(min_width=1500)

        with self.assertRaises(ValidationError):
            img_width_validator(self.valid_image_content_dict)

        img_width_validator = ImageWidthValidator(min_width=1280)
        img_width_validator(self.valid_image_content_dict)

    def test_image_height_validator(self):
        img_height_validator = ImageHeightValidator(min_height=1000)

        with self.assertRaises(ValidationError):
            img_height_validator(self.valid_image_content_dict)

        img_height_validator = ImageHeightValidator(min_height=720)
        img_height_validator(self.valid_image_content_dict)

    def test_image_resolution_validator(self):
        img_resolution_validator = ImageResolutionValidator(min_width=1280, max_height=404)

        img_resolution_validator = ImageResolutionValidator(max_width=666, max_height=720)

        with self.assertRaisesMessage(ValidationError, 'Invalid image width. Expected from 1 to 666, got 1280'):
            img_resolution_validator(self.valid_image_content_dict)

        img_resolution_validator = ImageResolutionValidator(max_width=1280, max_height=720)

        img_resolution_validator(self.valid_image_content_dict)


class LangTestCase(BaseTestCase):

    def test_lang(self):
        bulk_data = [
            dict(path=['_lang'], method='get'),
            dict(path=['_lang', 'ru'], method='get'),
            dict(path=['_lang', 'en'], method='get'),
            dict(path=['_lang', 'unkn'], method='get'),
            dict(path=['_lang', 'uk'], method='get'),
            dict(path=['_lang', 'cn'], method='get'),
            dict(path=['_lang', 'vi'], method='get'),
        ]
        results = self.bulk(bulk_data)
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['count'], 5)

        self.assertEqual(results[1]['data']['code'], 'ru')
        self.assertEqual(results[1]['data']['name'], 'Русский')
        self.assertEqual(results[1]['data']['translations']['Hello world!'], 'Привет мир!')
        self.assertFalse('Unknown string' in results[1]['data']['translations'])

        self.assertEqual(results[2]['data']['code'], 'en')
        self.assertEqual(results[2]['data']['name'], 'English')

        self.assertFalse('Hello world!' in results[3]['data']['translations'])

        self.assertEqual(results[4]['data']['code'], 'uk')
        self.assertEqual(results[4]['data']['name'], 'Empty list')
        self.assertEqual(results[4]['data']['translations'], {})

        self.assertEqual(results[5]['data']['code'], 'cn')
        self.assertEqual(results[5]['data']['name'], '简体中文')
        self.assertTrue(results[5]['data']['translations'])

        self.assertEqual(results[6]['data']['code'], 'vi')
        self.assertEqual(results[6]['data']['name'], 'Tiếng Việt')
        self.assertTrue(results[6]['data']['translations'])

    def test_translate_action(self):
        test_results = [
            {
                'original': 'enter value',
                'translated': 'введите значение'
            },
            {
                'original': 'репозиторий',
                'translated': 'репозиторий'
            }
        ]

        CustomTranslations = self.get_model_class('vstutils_api.CustomTranslations')
        CustomTranslations.objects.create(original='проверка перевода', translated="Успешно переведено", code='ru')

        bulk_data = [
            dict(path=['_lang', 'ru', 'translate'], method='post', data=dict(original='enter value')),
            dict(path=['_lang', 'en', 'translate'], method='post', data=dict(original='репозиторий')),
            dict(path=['_lang', 'ru', 'translate'], method='post', data=dict(original='проверка перевода')),
        ]
        results = self.bulk(bulk_data)
        # test successful translation
        self.assertEqual(201, results[0]['status'])
        self.assertEqual(test_results[0], results[0]['data'])
        # test not translated
        self.assertEqual(201, results[1]['status'])
        self.assertEqual(test_results[1], results[1]['data'])
        # Custom translations
        self.assertEqual(201, results[2]['status'])
        self.assertEqual("Успешно переведено", results[2]['data']['translated'])

    def test_user_language_detection(self):
        client = self.client_class()
        languages = (
            ('en', 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7,es;q=0.6'),
            ('ru', 'ru,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7,es;q=0.6'),
            ('en', 'de,es;q=0.9'),
            ('ru', 'de,es;q=0.9,ru;q=0.8,en-US;q=0.7,en;q=0.6'),
        )

        for expected_code, header in languages:
            response = self.client_class().get(self.login_url, HTTP_ACCEPT_LANGUAGE=header)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.cookies['lang'].value, expected_code)
            self.assertEqual(to_soup(response.content).html['lang'], expected_code, f'Header: {header}')

        response = client.get(f'{self.login_url}?lang=ru', HTTP_ACCEPT_LANGUAGE='de,es;q=0.9')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.cookies.get('lang').value, 'ru')
        self.assertEqual(to_soup(response.content).html['lang'], 'ru')

        response = client.get(self.login_url, HTTP_ACCEPT_LANGUAGE='de,es;q=0.9')
        self.assertEqual(to_soup(response.content).html['lang'], 'ru')

        response = self.client_class().get(self.login_url)
        self.assertEqual(to_soup(response.content).html['lang'], 'en')

        response = self.client_class().get(self.login_url, HTTP_ACCEPT_LANGUAGE='de,es;q=0.9')
        self.assertEqual(to_soup(response.content).html['lang'], 'en')


class CoreApiTestCase(BaseTestCase):

    def test_coreapi(self):
        client = CoreAPIClient()
        client.session.auth = HTTPBasicAuth(
            self.user.data['username'], self.user.data['password']
        )
        client.session.headers.update({'x-test': 'true'})
        schema = client.get('http://testserver/api/v1/schema/')
        result = client.action(schema, ['v1', 'user', 'list'])
        self.assertEqual(result['count'], 1)
        create_data = dict(username='test', password='123', password2='123')
        result = client.action(schema, ['v1', 'user', 'add'], create_data)
        self.assertEqual(result['username'], create_data['username'])
        self.assertFalse(result['is_staff'])
        self.assertTrue(result['is_active'])


class ProjectTestCase(BaseTestCase):
    def setUp(self):
        super(ProjectTestCase, self).setUp()
        self.predefined_hosts_cnt = 10
        for i in range(self.predefined_hosts_cnt):
            Host.objects.create(name='test_{}'.format(i))
        self.objects_bulk_data = [
            dict(method='post', path='hosts', data=dict(name='a')),
            dict(method='post', path='hosts/<<0[data][id]>>/subgroups', data=dict(name='b')),
            dict(method='post', path='hosts/<<1[data][id]>>/subgroups', data=dict(name='c')),
            dict(method='post', path='hosts/<<2[data][id]>>/subgroups', data=dict(name='d')),
            dict(method='post', path='hosts/<<0[data][id]>>/hosts', data=dict(name='aa')),
            dict(method='post', path='hosts/<<1[data][id]>>/hosts', data=dict(name='ba')),
            dict(method='post', path='hosts/<<2[data][id]>>/hosts', data=dict(name='ca')),
            dict(method='post', path='hosts/<<3[data][id]>>/hosts', data=dict(name='da')),
        ]
        self.test_file_path = os.path.join('test_proj', 'b64_test_image_file')
        self.test_file_value = get_file_value(self.test_file_path)
        self.multiplefile_post_data = [
                {'name': 'cat.jpeg', 'content': self.test_file_value, 'mediaType': 'images/jpeg'},
                {'name': 'same_cat.jpeg', 'content': self.test_file_value, 'mediaType': 'images/jpeg'}
        ]
        self.multiplefile_result_data = [
            {
                'name': '.jpeg',
                'mediaType': ''
            },
            {
                'name': '.jpeg',
                'mediaType': ''
            }
        ]

    def test_cachable_model(self):
        CachableModel = self.get_model_class('test_proj.CachableModel')
        results = self.bulk([
            {"method": 'get', "path": ['cachable']},
        ])
        self.assertEqual(results[0]['status'], 200)

        instance = CachableModel.objects.create(name='1')
        results = self.bulk([
            {"method": 'get', "path": ['cachable']},
            {"method": 'get', "path": ['cachable'], 'headers': {"HTTP_IF_NONE_MATCH": '<<0[headers][ETag]>>'}},
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['count'], 1)
        self.assertEqual(results[1]['status'], 304)

        instance.save()
        results = self.bulk([
            {"method": 'get', "path": ['cachable'], 'headers': {"HTTP_IF_NONE_MATCH": results[0]['headers']['ETag']}},
            {"method": 'get', "path": ['cachable'], 'headers': {"HTTP_IF_NONE_MATCH": '<<0[headers][ETag]>>'}},
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[1]['status'], 304)

    def test_env_vars(self):
        self.assertIn(settings.TEST_VAR_FROM_ENV, (os.environ['HOME'], 'default'))
        self.assertEqual(settings.TEST_VAR_FROM_ENV_DEFAULT, 'default')
        self.assertEqual(settings.TEST_VAR_FROM_ENV2, '123')

    def test_deep_host_create(self):
        bulk_data = [
            dict(method='post', path='deephosts', data={'name': 'level1'}),
            dict(method='post', path=['deephosts', '<<0[data][id]>>', 'subsubhosts'], data={'name': 'level2'}),
            dict(method='post',
                 path=['deephosts', '<<0[data][id]>>', 'subsubhosts', '<<1[data][id]>>', 'subdeephosts'],
                 data={'name': 'level3'}),
            dict(method='post',
                 path='deephosts/<<0[data][id]>>/subsubhosts/<<1[data][id]>>/subdeephosts/<<2[data][id]>>/shost',
                 data={'name': 'level4'}),
            dict(method='get',
                 path='deephosts/<<0[data][id]>>/subsubhosts/<<1[data][id]>>/subdeephosts/<<2[data][id]>>/hosts/<<3['
                      'data][id]>>',
                 data={'name': 'level4'}),
            dict(method='get',
                 path='deephosts/<<0[data][id]>>/subsubhosts/<<1[data][id]>>/subdeephosts/<<2[data][id]>>/hosts',
                 data={'name': 'level4'}),
        ]
        results = self.bulk(bulk_data)
        for result in results[:-2]:
            self.assertEqual(result['status'], 201, f'Current result number is `{result}`')
        self.assertEqual(results[-2]['status'], 200)
        self.assertEqual(results[-2]['data']['name'], 'level4')
        self.assertEqual(results[-1]['status'], 200)
        self.assertEqual(results[-1]['data']['count'], 1)

    def test_models(self):
        self.assertEqual(Host.objects.all().count(), self.predefined_hosts_cnt)
        Host.objects.all().delete()
        Host.objects.create(name='test_one')
        self.assertEqual(Host.objects.all().test_filter2().count(), 1)
        Host.objects.create(name=self.random_name(), hidden=True)
        self.assertEqual(Host.objects.all().count(), 2)
        self.assertEqual(Host.objects.all().cleared().count(), 1)
        self.assertTrue(hasattr(Host.objects, 'test_filter'))

    def _check_subhost(self, id, *args, **kwargs):
        result = self.get_result(
            'get',
            ('hosts', id, *map("{0[0]}/{0[1]}".format, args))
        )
        for key, value in kwargs.items():
            self.assertEqual(result.get(key, None), value, result)

    def test_objects_copy(self):
        Host.objects.all().delete()
        HostGroup.objects.all().delete()
        bulk_data = [
            *self.objects_bulk_data,
            dict(method='post', path='hosts/<<1[data][id]>>/copy', data=dict(name='copied')),
            dict(method='post', path='hosts/<<1[data][id]>>/copy'),
        ]
        results = self.bulk(bulk_data)
        self.assertNotEqual(results[-2]['data']['id'], results[1]['data']['id'])
        self.assertEqual(results[-2]['data']['name'], 'copied')
        self.assertNotEqual(results[-1]['data']['id'], results[1]['data']['id'])
        self.assertEqual(
            results[-1]['data']['name'], 'copy-{}'.format(results[1]['data']['name'])
        )
        self._check_subhost(
            results[0]['data']['id'],
            ('subgroups', results[-1]['data']['id']),
            name='copy-b'
        )
        self._check_subhost(
            results[0]['data']['id'],
            ('subgroups', results[-2]['data']['id']),
            name='copied'
        )
        self._check_subhost(
            results[-1]['data']['id'],
            ('hosts', results[5]['data']['id']),
            name='ba'
        )

    def test_insert_into(self):
        size = 10
        bulk_data = [
            dict(method='post', path='hosts', data=dict(name='main')),
            *[dict(method='post', path='subhosts', data=dict(name=f'slave-{i}')) for i in range(size)],
            dict(method='post', path='hosts/<<0[data][id]>>/shost', data=[f'<<{i + 1}[data]>>' for i in range(size)]),
            dict(method='get', path='hosts/<<0[data][id]>>/shost')
        ]
        results = self.bulk(bulk_data)
        self.assertEqual(results[-1]['data']['count'], size)

        results = self.bulk([
            dict(method='get', path='hosts'),
            dict(method='post', path='hosts/<<0[data][results][0][id]>>/shost', data=['{"name": "JsonString"}']),
            dict(method='get', path='hosts/<<0[data][results][0][id]>>/shost')
        ])
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual('JsonString', results[2]['data']['results'][-1]['name'])

    def test_base_enum(self):
        # check is_equal

        class FieldChoices(BaseEnum):
            FIRST = 'FIRST'
            SECOND = 'SECOND'
            THIRD = 'THIRD'

        self.assertFalse(FieldChoices.FIRST.not_equal('FIRST'))
        self.assertTrue(FieldChoices.SECOND.is_equal('SECOND'))
        self.assertFalse(FieldChoices.THIRD.not_equal('THIRD'))
        self.assertListEqual(
            FieldChoices.to_choices(),
            [('FIRST', 'FIRST',), ('SECOND', 'SECOND'), ('THIRD', 'THIRD')]
        )


    @override_settings(SESSION_ENGINE='django.contrib.sessions.backends.db')
    def test_hierarchy(self):
        Host.objects.all().delete()
        HostGroup.objects.all().delete()
        bulk_data = list(self.objects_bulk_data)
        results = self.bulk(bulk_data)
        for result in results:
            self.assertEqual(result['status'], 201, result)
            del result
        self._check_subhost(results[0]['data']['id'], name='a')
        self._check_subhost(
            results[0]['data']['id'],
            ('subgroups', results[1]['data']['id']),
            name='b'
        )
        self._check_subhost(
            results[1]['data']['id'],
            ('subgroups', results[2]['data']['id']),
            name='c'
        )
        self._check_subhost(
            results[2]['data']['id'],
            ('subgroups', results[3]['data']['id']),
            name='d'
        )
        self._check_subhost(
            results[0]['data']['id'],
            ('hosts', results[4]['data']['id']),
            name='aa'
        )
        self._check_subhost(
            results[1]['data']['id'],
            ('hosts', results[5]['data']['id']),
            name='ba'
        )
        self._check_subhost(
            results[2]['data']['id'],
            ('hosts', results[6]['data']['id']),
            name='ca'
        )
        self._check_subhost(
            results[3]['data']['id'],
            ('hosts', results[7]['data']['id']),
            name='da'
        )
        # More tests
        host_group_id = results[0]['data']['id']
        host_id = results[4]['data']['id']
        hg = HostGroup.objects.get(pk=host_group_id)
        bulk_data = [
            dict(method='get', path=['hosts', host_group_id, 'subgroups']),
            dict(method='get', path=['hosts', host_group_id, 'hosts']),
            dict(method='patch', path=['hosts', host_group_id, 'hosts', host_id], data=dict(name='test1')),
            dict(method='get', path=['hosts', host_group_id, 'hosts', host_id]),
            dict(method='put', path=['hosts', host_group_id, 'hosts', host_id], data=dict(name='test2')),
            dict(method='get', path=['hosts', host_group_id, 'hosts', host_id]),
            dict(method='get', path=['hosts', host_group_id, 'hosts', 999]),
            dict(method='get', path=['hosts', host_group_id, 'subhosts']),
            dict(method='delete', path=['hosts', host_group_id, 'hosts', host_id]),
            dict(method='patch', path=['hosts', host_group_id, 'hosts', host_id], data=dict(name='')),
            dict(method='post', path=['hosts', host_group_id, 'shost'], data=dict(name='some')),
            dict(method='delete', path=['hosts', host_group_id, 'shost', '<<10[data][id]>>']),
            dict(method='get', path=['hosts', host_group_id, 'hosts'], query='offset=10'),
            dict(method='get', path=['hosts', host_group_id, 'shost', '<<24[data][id]>>']),
            dict(method='post', path=['hosts', host_group_id, 'shost'], data=dict(name='some_other')),
            dict(method='post', path=['hosts', host_group_id, 'shost', '<<14[data][id]>>', 'test']),
            dict(method='post', path=['hosts', host_group_id, 'shost', '<<14[data][id]>>', 'test2']),
            dict(method='post', path=['hosts', host_group_id, 'shost', '<<14[data][id]>>', 'test3']),
            dict(method='delete', path=['hosts', host_group_id, 'shost', '<<14[data][id]>>']),
            dict(method='post', path=['hosts', host_group_id, 'shost'], data=dict(id='<<14[data][id]>>')),
        ]
        results = self.bulk(bulk_data)
        self.assertCount(hg.hosts.all(), 1)
        self.assertEqual(results[0]['data']['count'], 1, results[0])
        self.assertEqual(results[1]['data']['count'], 1, results[1])
        self.assertEqual(results[2]['data']['id'], host_id)
        self.assertEqual(results[2]['data']['name'], 'test1')
        self.assertEqual(results[3]['data']['id'], host_id)
        self.assertEqual(results[3]['data']['name'], 'test1')
        self.assertEqual(results[4]['data']['id'], host_id)
        self.assertEqual(results[4]['data']['name'], 'test2')
        self.assertEqual(results[5]['data']['id'], host_id)
        self.assertEqual(results[5]['data']['name'], 'test2')
        self.assertEqual(results[6]['status'], 404)
        self.assertEqual(results[7]['data']['count'], 1)
        self.assertEqual(results[8]['status'], 204)
        self.assertEqual(results[9]['status'], 404)
        self.assertEqual(results[10]['data']['name'], 'some')
        self.assertEqual(results[11]['status'], 204)
        self.assertTrue(Host.objects.filter(pk=results[10]['data']['id']).exists())
        self.assertEqual(results[12]['data']['results'], [])
        self.assertEqual(results[13]['status'], 500)
        self.assertTrue('IndexError' in results[13]['info']['errors'])
        self.assertEqual(results[15]['status'], 200)
        self.assertEqual(results[15]['data']['detail'], "OK")
        self.assertEqual(results[16]['status'], 201)
        self.assertEqual(results[16]['data']['detail'], "OK")
        self.assertEqual(results[17]['status'], 404)
        self.assertEqual(results[18]['status'], 204)
        self.assertEqual(results[19]['status'], 201)

        bulk_data = [
            dict(path=['hosts'], method='post', data=dict(name='level1')),
            dict(path=['subhosts'], method='post', data=dict(name='level1_subhost')),
            dict(path=['hosts', '<<0[data][id]>>', 'shost'], method='post', data='<<1[data]>>'),
        ]
        results = self.bulk(bulk_data)
        self.assertEqual(results[-1]['status'], 201, results)

    def test_coreapi_schema(self):
        stdout = io.StringIO()
        call_command(
            'generate_swagger',
            '--url', 'http://localhost:8080/',
            '--user', self.user.username,
            format='json', stdout=stdout
        )
        data = json.loads(stdout.getvalue())
        # Check default settings
        self.assertEqual(
            data['basePath'], f'/{self._settings("VST_API_URL")}/{self._settings("VST_API_VERSION")}'
        )
        self.assertEqual(
            data['info']['contact']['someExtraUrl'],
            self._settings('CONTACT')['some_extra_url']
        )
        self.assertEqual(data['info']['title'], self._settings('PROJECT_GUI_NAME'))
        self.assertEqual(data['swagger'], '2.0')
        # Check default values
        api_model_user = data['definitions']['User']
        self.assertEqual(api_model_user['type'], 'object')
        self.assertIn('username', api_model_user['required'])
        self.assertEqual(api_model_user['properties']['username']['type'], 'string')
        self.assertEqual(api_model_user['properties']['id']['type'], 'integer')
        self.assertEqual(api_model_user['properties']['id']['readOnly'], True)
        self.assertEqual(api_model_user['properties']['is_active']['type'], 'boolean')
        self.assertEqual(api_model_user['properties']['is_staff']['type'], 'boolean')
        # Check autocomplete field
        api_model_hostgroup = data['definitions']['HostGroup']
        hostgroup_props = api_model_hostgroup['properties']
        self.assertEqual(api_model_hostgroup['properties']['parent']['type'], 'string')
        self.assertEqual(hostgroup_props['parent']['format'], 'fk_autocomplete')
        self.assertEqual(
            hostgroup_props['parent']['additionalProperties']['model']['$ref'],
            '#/definitions/Host'
        )
        self.assertEqual(
            hostgroup_props['parent']['additionalProperties']['value_field'], 'id'
        )
        self.assertEqual(
            hostgroup_props['parent']['additionalProperties']['view_field'], 'name'
        )
        # Check file and secret_file fields
        self.assertEqual(hostgroup_props['file']['type'], 'string')
        self.assertEqual(hostgroup_props['file']['format'], 'file')
        self.assertEqual(hostgroup_props['secret_file']['type'], 'string')
        self.assertEqual(hostgroup_props['secret_file']['format'], 'secretfile')

        urls = [
            '/deephosts/',
            '/deephosts/{id}/',
            '/deephosts/{id}/copy/',
            '/deephosts/{id}/subdeephosts/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/copy/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/hosts/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/hosts/{hosts_id}/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/hosts/{hosts_id}/test/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/hosts/{hosts_id}/test2/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/hosts/{hosts_id}/test3/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/shost/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/shost/{shost_id}/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/shost/{shost_id}/test/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/shost/{shost_id}/test2/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/shost_all/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/shost_all/{shost_all_id}/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/subgroups/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/subgroups/{subgroups_id}/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/subhosts/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/subhosts/test/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/subhosts/test2/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/subhosts/test3/',
            '/deephosts/{id}/subsubhosts/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/copy/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/copy/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/hosts/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/hosts/{hosts_id}/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/hosts/{hosts_id}/test/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/hosts/{hosts_id}/test2/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/hosts/{hosts_id}/test3/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/shost/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/shost/{shost_id}/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/shost/{shost_id}/test/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/shost/{shost_id}/test2/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/shost_all/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/shost_all/{shost_all_id}/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/subgroups/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/subgroups/{subgroups_id}/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/subhosts/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/subhosts/test/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/subhosts/test2/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/subhosts/test3/',
            '/hosts/',
            '/hosts/{id}/',
            '/hosts/{id}/copy/',
            '/hosts/{id}/hosts/',
            '/hosts/{id}/hosts/{hosts_id}/',
            '/hosts/{id}/hosts/{hosts_id}/test/',
            '/hosts/{id}/hosts/{hosts_id}/test2/',
            '/hosts/{id}/hosts/{hosts_id}/test3/',
            '/hosts/{id}/shost/',
            '/hosts/{id}/shost/{shost_id}/',
            '/hosts/{id}/shost/{shost_id}/test/',
            '/hosts/{id}/shost/{shost_id}/test2/',
            '/hosts/{id}/shost_all/',
            '/hosts/{id}/shost_all/{shost_all_id}/',
            '/hosts/{id}/subgroups/',
            '/hosts/{id}/subgroups/{subgroups_id}/',
            '/hosts/{id}/subhosts/',
            '/hosts/{id}/subhosts/test/',
            '/hosts/{id}/subhosts/test2/',
            '/hosts/{id}/subhosts/test3/',
            '/subhosts/',
            '/subhosts/{id}/',
            '/subhosts/{id}/test/',
            '/subhosts/{id}/test2/',
            '/subhosts/{id}/test3/',
            '/testbinaryfiles/',
            '/testbinaryfiles/{id}/',
            '/testfk/',
            '/testfk/{id}/',
            '/user/',
            '/user/{id}/',
            '/user/{id}/change_password/'
        ]

        for url in urls:
            self.assertIn(url, data['paths'])

        self.assertNotIn('/testbinaryfiles2/', data['paths'])

        # Check useFetch and makeLink properties
        definitions = data['definitions']

        properties = definitions['OneModelWithFK']['properties']['some_fk']['additionalProperties']
        self.assertEqual(properties['usePrefetch'], True)
        self.assertEqual(properties['makeLink'], True)

        properties = definitions['OneModelWithFK']['properties']['no_prefetch_and_link_fk']['additionalProperties']
        self.assertEqual(properties['usePrefetch'], False)
        self.assertEqual(properties['makeLink'], False)

        properties = definitions['OneModelWithFK']['properties']['multiselect']['additionalProperties']
        self.assertEqual(properties['usePrefetch'], False)
        self.assertEqual(properties['makeLink'], True)

    def test_manifest_json(self):
        result = self.get_result('get', '/manifest.json')
        self.assertEqual(result['name'], 'Example project')
        self.assertEqual(result['short_name'], 'Test_proj')
        self.assertEqual(result['display'], 'fullscreen')

    def test_model_fk_field(self):
        bulk_data = [
            dict(method='post', path='subhosts', data={'name': 'tt_name'}),
            dict(method='post', path='testfk', data={'some_fk': '<<0[data][id]>>'}),
        ]
        results = self.bulk(bulk_data)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[1]['data']['some_fk'], results[0]['data']['id'])
        with self.assertRaises(ValidationError):
            FkField(select=Post, dependence={'author': 'name'}, filters={'name': 'Lee'})

    def test_model_related_list_field(self):
        date = '2021-01-20T00:26:38Z'
        author_1 = Author.objects.create(name='author_1', registerDate=date)
        post_1 = Post.objects.create(author=author_1, title='post_1')
        post_2 = Post.objects.create(author=author_1, title='post_2')
        test_data = {
            'id': author_1.id,
            'name': author_1.name,
            'registerDate': date,
            'posts': [
                {
                    'title': post_1.title
                },
                {
                    'title': post_2.title
                }
            ]
        }
        results = self.bulk([
            {'method': 'get', 'path': ['author']},
            {'method': 'get', 'path': ['author', '<<0[data][results][0][id]>>']},
        ])
        self.assertEqual(test_data, results[1]['data'])

    def test_fk_filtering(self):
        author_1 = Author.objects.create(name='author_1', registerDate='2021-01-20T00:26:38Z')
        author_2 = Author.objects.create(name='author_2', registerDate='2021-01-20T00:26:38Z')
        author_1_post_count = 3
        author_2_post_count = 6
        authors_post_count = author_1_post_count + author_2_post_count
        for i in range(author_1_post_count):
            author_1.post.create(title=f'post_{i}')
        for i in range(author_2_post_count):
            author_2.post.create(title=f'post_{i}')

        results = self.bulk([
            {'method': "get", "path": ["post"]},
            {'method': "get", "path": ["post"], "query": f"author={author_1.name}"},
            {'method': "get", "path": ["post"], "query": f"author={author_1.id}"},
            {'method': "get", "path": ["post"], "query": f"author={author_2.name}"},
            {'method': "get", "path": ["post"], "query": f"author={author_2.id}"},
        ])

        for pos, count in enumerate((
                authors_post_count,
                author_1_post_count,
                author_1_post_count,
                author_2_post_count,
                author_2_post_count,
        )):
            self.assertEqual(results[pos]['status'], 200)
            self.assertEqual(results[pos]['data']['count'], count)

    # find me
    def test_model_rating_field(self):
        date = '2021-01-20T00:26:38Z'
        author = Author.objects.create(name='author_1', registerDate=date)
        post_data = {
            'author': author,
            'title': 'exm_post',
            'rating': 8.0,
            'fa_icon_rating': 0.0,
            'text': 'lorem'
        }
        post = Post.objects.create(**post_data)
        post_data['rating'] = 25
        post_data['author'] = author.id
        post_data['id'] = post.id
        results = self.bulk([
            {'method': 'post', 'path': ['author', author.id, 'post'], 'data': post_data},
            {'method': 'get', 'path': ['author', author.id, 'post']},
            {'method': 'get', 'path': ['author', author.id, 'post', '<<1[data][results][0][id]>>']},
        ])
        post_data['rating'] = 8
        self.assertEqual(['Ensure this value is less than or equal to 10.'], results[0]['data']['rating'])
        self.assertDictEqual(post_data, results[2]['data'])

    def test_multiplefilefield(self):
        post_data = {
            'some_multiplefile': self.multiplefile_post_data
        }
        results = self.bulk([
            {'method': 'post', 'path': ['testbinarymodelschema'], 'data': post_data},
            {'method': 'get', 'path': ['testbinarymodelschema']},
        ])
        created_model_field = OverridenModelWithBinaryFiles.objects.get(id=results[0]['data']['id']).some_multiplefile
        # check if if we have a list of valid files
        self.assertIsInstance(created_model_field, list)
        self.assertIsInstance(created_model_field[0].size, int)

        # mock 'content' value bacause it's too hard to predict
        result_data = self.multiplefile_result_data
        result_data[0]['content'] = results[1]['data']['results'][0]['some_multiplefile'][0]['content']
        result_data[1]['content'] = results[1]['data']['results'][0]['some_multiplefile'][1]['content']
        # check only extension out of all name because of unique name generation for files
        results[0]['data']['some_multiplefile'][0]['name'] = results[0]['data']['some_multiplefile'][0]['name'][-5:]
        results[0]['data']['some_multiplefile'][1]['name'] = results[0]['data']['some_multiplefile'][1]['name'][-5:]
        results[1]['data']['results'][0]['some_multiplefile'][0]['name'] = results[1]['data']['results'][0]['some_multiplefile'][0]['name'][-5:]
        results[1]['data']['results'][0]['some_multiplefile'][1]['name'] = results[1]['data']['results'][0]['some_multiplefile'][1]['name'][-5:]

        # test POST response
        self.assertEqual(result_data, results[0]['data']['some_multiplefile'])
        # test GET response
        self.assertEqual(result_data, results[1]['data']['results'][0]['some_multiplefile'])

    def test_multipleimagefield(self):
        post_data = {
            'some_multipleimage': self.multiplefile_post_data
        }
        results = self.bulk([
            {'method': 'post', 'path': ['testbinarymodelschema'], 'data': post_data},
            {'method': 'get', 'path': ['testbinarymodelschema']},
        ])
        # mock 'content' value bacause it's too hard to predict
        result_data = self.multiplefile_result_data
        result_data[0]['content'] = results[1]['data']['results'][0]['some_multipleimage'][0]['content']
        result_data[1]['content'] = results[1]['data']['results'][0]['some_multipleimage'][1]['content']
        # check only extension out of all name because of unique name generation for files
        results[0]['data']['some_multipleimage'][0]['name'] = results[0]['data']['some_multipleimage'][0]['name'][-5:]
        results[0]['data']['some_multipleimage'][1]['name'] = results[0]['data']['some_multipleimage'][1]['name'][-5:]
        results[1]['data']['results'][0]['some_multipleimage'][0]['name'] = results[1]['data']['results'][0]['some_multipleimage'][0]['name'][-5:]
        results[1]['data']['results'][0]['some_multipleimage'][1]['name'] = results[1]['data']['results'][0]['some_multipleimage'][1]['name'][-5:]

        created_model_field = OverridenModelWithBinaryFiles.objects.get(id=results[0]['data']['id'])
        # check if if we have a list of valid images in field
        self.assertIsInstance(created_model_field.some_multipleimage, list)
        self.assertIsInstance(created_model_field.some_multipleimage[0].height, int)
        self.assertIsInstance(created_model_field.some_multipleimage[0].width, int)

        # test .save()
        name = 'slightly_different_cat.jpeg'
        content = created_model_field.some_multipleimage[0]
        created_model_field.some_multipleimage[0].save(name, content.file)
        self.assertEqual(name, created_model_field.some_multipleimage[0].name)

        # test .delete()
        self.assertEqual(2, len(created_model_field.some_multipleimage))
        # we calling width of an image to initiate _dimensions_cache
        created_model_field.some_multipleimage[0].width
        created_model_field.some_multipleimage[0].delete()
        created_model_field.refresh_from_db()
        self.assertEqual(1, len(created_model_field.some_multipleimage))

        # test POST response
        self.assertEqual(result_data, results[0]['data']['some_multipleimage'])
        # test GET response
        self.assertEqual(result_data, results[1]['data']['results'][0]['some_multipleimage'])

    def test_multiplefilefield_empty(self):

        results = self.bulk([
            {'method': 'post', 'path': ['testbinarymodelschema'], 'data': {}},
        ])
        test_obj = OverridenModelWithBinaryFiles.objects.get(id=results[0]['data']['id'])
        test_create = OverridenModelWithBinaryFiles.objects.create(some_multiplefile_none=[None])
        self.assertIsInstance(test_create.some_multiplefile_none[0], MultipleFieldFile)
        self.assertEqual([], test_obj.some_multiplefile)
        self.assertEqual([], test_obj.some_multiplefile_none)

    def test_model_namedbinfile_field(self):
        file = get_file_value(os.path.join(DIR_PATH, 'image_b64_valid'))
        valid_image_content_dict = {
            'name': 'cat.jpg',
            'content': file,
            'mediaType': 'image/jpeg'
        }
        value = {'name': 'abc.png', 'content': '/4sdfsdf/', 'mediaType': 'text/txt'}
        missing_mediaType = {'name': '123', 'content': 'qwedsf'}
        instance_without_mediaType = self.get_model_filter('test_proj.models.ModelWithBinaryFiles').create(some_namedbinfile=json.dumps(missing_mediaType))
        bulk_data = [
            dict(method='post', path=['testbinaryfiles'], data={}),
            dict(method='get', path=['testbinaryfiles', '<<0[data][id]>>']),
            dict(
                method='put',
                path=['testbinaryfiles', '<<0[data][id]>>'],
                data=dict(some_namedbinfile=value, some_namedbinimage=value, some_binfile=value['content'])
            ),
            dict(method='get', path=['testbinaryfiles', '<<0[data][id]>>']),
            dict(
                method='patch',
                path=['testbinaryfiles', '<<0[data][id]>>'],
                data=dict(some_namedbinfile={'name': 'qwe', 'content1': 123})
            ),
            dict(
                method='patch',
                path=['testbinaryfiles', '<<0[data][id]>>'],
                data=dict(some_namedbinfile={'name': 'qwe'})
            ),
            dict(
                method='patch',
                path=['testbinaryfiles', '<<0[data][id]>>'],
                data=dict(some_namedbinfile=123)
            ),
            # Tests for 'multiplenamedbinfile' field
            dict(
                method='get',
                path=['testbinaryfiles', '<<0[data][id]>>'],
            ),
            dict(
                method='patch',
                path=['testbinaryfiles', '<<0[data][id]>>'],
                data=dict(some_multiplenamedbinfile=123)
            ),
            dict(
                path=['testbinaryfiles', '<<0[data][id]>>'],
                method='patch',
                data=dict(some_multiplenamedbinfile={})
            ),
            dict(
                path=['testbinaryfiles', '<<0[data][id]>>'],
                method='patch',
                data=dict(some_multiplenamedbinfile=[])
            ),
            dict(
                path=['testbinaryfiles', '<<0[data][id]>>'],
                method='get',
            ),
            dict(
                path=['testbinaryfiles', '<<0[data][id]>>'],
                method='patch',
                data=dict(some_multiplenamedbinfile=[123])
            ),
            dict(
                path=['testbinaryfiles', '<<0[data][id]>>'],
                method='patch',
                data=dict(some_multiplenamedbinfile=[value])
            ),
            dict(
                path=['testbinaryfiles', '<<0[data][id]>>'],
                method='get',
            ),
            dict(
                path=['testbinaryfiles', '<<0[data][id]>>'],
                method='patch',
                data=dict(some_multiplenamedbinfile=[value, 123])
            ),
            dict(
                path=['testbinaryfiles', '<<0[data][id]>>'],
                method='patch',
                data=dict(some_multiplenamedbinfile=[value, {"name1": "invalid", "content": "123"}])
            ),
            dict(
                path=['testbinaryfiles', '<<0[data][id]>>'],
                method='patch',
                data=dict(some_multiplenamedbinfile=[value, value])
            ),
            dict(
                path=['testbinaryfiles', '<<0[data][id]>>'],
                method='get',
            ),
            # Tests for 'multiplenamedbinimage' field
            dict(
                path=['testbinaryfiles', '<<0[data][id]>>'],
                method='get',
            ),
            dict(
                path=['testbinaryfiles', '<<0[data][id]>>'],
                method='patch',
                data=dict(some_multiplenamedbinimage=123)
            ),
            dict(
                path=['testbinaryfiles', '<<0[data][id]>>'],
                method='patch',
                data=dict(some_multiplenamedbinimage={})
            ),
            dict(
                path=['testbinaryfiles', '<<0[data][id]>>'],
                method='patch',
                data=dict(some_multiplenamedbinimage=[])
            ),
            dict(
                path=['testbinaryfiles', '<<0[data][id]>>'],
                method='get',
            ),
            dict(
                method='patch',
                path=['testbinaryfiles', '<<0[data][id]>>'],
                data=dict(some_multiplenamedbinimage=[123])
            ),
            dict(
                method='patch',
                path=['testbinaryfiles', '<<0[data][id]>>'],
                data=dict(some_multiplenamedbinimage=[value])
            ),
            dict(
                method='get',
                path=['testbinaryfiles', '<<0[data][id]>>'],
            ),
            dict(
                method='patch',
                path=['testbinaryfiles', '<<0[data][id]>>'],
                data=dict(some_multiplenamedbinimage=[value, 123])
            ),
            dict(
                method='patch',
                path=['testbinaryfiles', '<<0[data][id]>>'],
                data=dict(some_multiplenamedbinimage=[value, {"name1": "invalid", "content": "123"}])
            ),
            dict(
                method='patch',
                path=['testbinaryfiles', '<<0[data][id]>>'],
                data=dict(some_multiplenamedbinimage=[value, value])
            ),
            dict(
                method='get',
                path=['testbinaryfiles', '<<0[data][id]>>'],
            ),
            {'method': 'post', 'path': 'testbinaryfiles', 'data': {'some_namedbinimage': missing_mediaType}},
            {
                'method': 'post',
                'path': 'testbinaryfiles',
                'data': {'some_multiplenamedbinimage': [missing_mediaType, missing_mediaType]}
            },
            {
                'method': 'post',
                'path': 'testbinaryfiles',
                'data': {'some_multiplenamedbinfile': [missing_mediaType, missing_mediaType]}
            },
            {'method': 'get', 'path': ['testbinaryfiles', instance_without_mediaType.id]},
            {'method': 'post', 'path': ['testbinaryfiles'], 'data': {'some_validatedmultiplenamedbinimage': [valid_image_content_dict]}},
        ]
        results = self.bulk(bulk_data)
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200, results[0])
        self.assertEqual(results[1]['data']['some_binfile'], '')
        self.assertEqual(results[1]['data']['some_namedbinfile'], dict(name=None, content=None, mediaType=None))
        self.assertEqual(results[1]['data']['some_namedbinimage'], dict(name=None, content=None, mediaType=None))
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[3]['status'], 200)
        self.assertEqual(results[3]['data']['some_binfile'], value['content'])
        self.assertEqual(results[3]['data']['some_namedbinfile'], value)
        self.assertEqual(results[3]['data']['some_namedbinimage'], value)
        self.assertEqual(results[4]['status'], 400)
        self.assertEqual(results[5]['status'], 400)
        self.assertEqual(results[6]['status'], 400)

        self.assertEqual(results[7]['status'], 200)
        self.assertEqual(results[7]['data']['some_multiplenamedbinfile'], [])
        self.assertEqual(results[8]['status'], 400)
        self.assertEqual(results[9]['status'], 400)
        self.assertEqual(results[10]['status'], 200)
        self.assertEqual(results[11]['status'], 200)
        self.assertEqual(results[11]['data']['some_multiplenamedbinfile'], [])
        self.assertEqual(results[12]['status'], 400)
        self.assertEqual(results[13]['status'], 200)
        self.assertEqual(results[14]['status'], 200)
        self.assertEqual(results[14]['data']['some_multiplenamedbinfile'], [value])
        self.assertEqual(results[15]['status'], 400)
        self.assertEqual(results[16]['status'], 400)
        self.assertEqual(results[17]['status'], 200)
        self.assertEqual(results[18]['status'], 200)
        self.assertEqual(results[18]['data']['some_multiplenamedbinfile'], [value, value])

        self.assertEqual(results[19]['status'], 200)
        self.assertEqual(results[19]['data']['some_multiplenamedbinimage'], [])
        self.assertEqual(results[20]['status'], 400)
        self.assertEqual(results[21]['status'], 400)
        self.assertEqual(results[22]['status'], 200)
        self.assertEqual(results[23]['status'], 200)
        self.assertEqual(results[23]['data']['some_multiplenamedbinimage'], [])
        self.assertEqual(results[24]['status'], 400)
        self.assertEqual(results[25]['status'], 200)
        self.assertEqual(results[26]['status'], 200)
        self.assertEqual(results[26]['data']['some_multiplenamedbinimage'], [value])
        self.assertEqual(results[27]['status'], 400)
        self.assertEqual(results[28]['status'], 400)
        self.assertEqual(results[29]['status'], 200)
        self.assertEqual(results[30]['status'], 200)
        self.assertEqual(results[30]['data']['some_multiplenamedbinimage'], [value, value])
        self.assertEqual(results[31]['status'], 400)
        self.assertEqual(results[32]['status'], 400)
        self.assertEqual(results[33]['status'], 400)
        self.assertEqual(results[34]['status'], 200)
        self.assertEqual(results[34]['data']['some_namedbinfile'], dict(**missing_mediaType, mediaType=None))
        self.assertEqual(results[35]['status'], 400)
        self.assertEqual(results[35]['data']['some_validatedmultiplenamedbinimage'][0], 'Invalid image height. Expected from 200 to 600, got 720')

    def test_file_field(self):
        with open(os.path.join(DIR_PATH, 'cat.jpeg'), 'rb') as cat1:
            cat64 = base64.b64encode(cat1.read()).decode('utf-8')
        # convert file to json
        valid_image_content_dict = {
            'name': 'cat.jpg',
            'content': cat64,
            'mediaType': 'image/jpeg'
        }

        results = self.bulk([
            {
                'method': 'post',
                'path': ['testbinaryfiles'],
                'data': {'some_filefield': valid_image_content_dict, 'some_imagefield': valid_image_content_dict}},
            {
                'method': 'get',
                'path': ['testbinaryfiles', '<<0[data][id]>>']
            },
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        model_qs = self.get_model_filter('test_proj.models.ModelWithBinaryFiles')
        instance = model_qs.get(id=results[0]['data']['id'])
        self.assertDictEqual({
            'content': instance.some_filefield.url,
            'name': instance.some_filefield.name,
            'mediaType': ''
        },
            results[1]['data']['some_filefield'])
        self.assertDictEqual({
            'content': instance.some_imagefield.url,
            'name': instance.some_imagefield.name,
            'mediaType': ''
        },
            results[1]['data']['some_imagefield'])
        with open(os.path.join(DIR_PATH, 'cat.jpeg'), 'rb') as cat1:
            self.assertEqual(instance.some_filefield.file.read(), cat1.read())

    def test_related_list_field(self):
        with open(os.path.join(DIR_PATH, 'cat.jpeg'), 'rb') as fd:
            content = fd.read()

        def file_data(file_name):
            return SimpleUploadedFile(name=file_name, content=content)

        # create ModelWithBinaryFiles model with empty fields
        obj_with_empty_fields = ModelWithBinaryFiles.objects.create()
        related_model = ModelForCheckFileAndImageField.objects.create(some_json_field='test')
        obj_with_empty_fields.related_model.add(related_model)

        results = self.bulk([
            {'method': 'get', 'path': ['test_json_file_image_fields_model', related_model.id]},
        ])
        # if some_namedbinfile is Empty or invalid - return None
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(
            results[0]['data']['some_related_field'][0]['some_namedbinfile'],
            {"name": None, "content": None, 'mediaType': None}
        )
        # if 'some_namedbinimage' is Empty or invalid - return None
        self.assertEqual(
            results[0]['data']['some_related_field'][0]['some_namedbinimage'],
            {"name": None, "content": None, 'mediaType': None}
        )
        # if 'some_multiplenamedbinfile' is empty or invalid - return empty list
        self.assertEqual(
            results[0]['data']['some_related_field'][0]['some_multiplenamedbinfile'],
            []
        )
        # if 'some_multiplenamedbinimage' is empty or invalid - return empty list
        self.assertEqual(
            results[0]['data']['some_related_field'][0]['some_multiplenamedbinimage'],
            []
        )
        # if 'some_filefield' is empty or invalid - return empty list
        self.assertEqual(
            results[0]['data']['some_related_field'][0]['some_filefield'],
            {"name": None, "content": None, 'mediaType': None}
        )
        obj_with_empty_fields.delete()

        json_data = json.dumps({'name': 'abc.png', 'content': '/4sdfsdf/', 'mediaType': 'text/txt'})
        author = Author.objects.create(name='test_author', image=file_data('extra.jpg'))
        obj_with_valid_fields = ModelWithBinaryFiles.objects.create(
            some_binfile='test',
            some_namedbinfile=json_data,
            some_namedbinimage=json_data,
            some_filefield=file_data('test_file'),
            some_imagefield=file_data('test_image.jpg'),
            some_FkModelfield=author,
            some_multiplefile=[
                file_data('test_multiplefile1'),
                file_data('test_multiplefile2'),
            ],
            some_multipleimage=[
                file_data('test_multipleimage1.jpg'),
                file_data('test_multipleimage2.jpg'),
            ],
        )
        obj_with_valid_fields.related_model.add(related_model)
        results = self.bulk([
            {'method': 'get', 'path': ['test_json_file_image_fields_model', related_model.id]},
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(
            results[0]['data']['some_related_field'][0]['some_filefield'],
            {'content': '/media/test_file', 'mediaType': '', 'name': 'test_file'}
        )
        self.assertEqual(
            results[0]['data']['some_related_field'][0]['some_imagefield'],
            {'content': '/media/test_image.jpg', 'name': 'test_image.jpg', 'mediaType': ''}
        )
        self.assertEqual(
            results[0]['data']['some_related_field'][0]['some_namedbinfile'],
            {'content': '/4sdfsdf/', 'mediaType': 'text/txt', 'name': 'abc.png'}
        )
        self.assertEqual(
            results[0]['data']['some_related_field'][0]['some_namedbinimage'],
            {'content': '/4sdfsdf/', 'mediaType': 'text/txt', 'name': 'abc.png'}
        )
        self.assertEqual(
            results[0]['data']['some_related_field'][0]['some_FkModelfield__image'],
            {'content': '/media/extra.jpg', 'mediaType': '', 'name': 'extra.jpg'}
        )
        # 'multiplefile' to return list of dicts with values
        self.assertEqual(
            results[0]['data']['some_related_field'][0]['some_multiplefile'],
            [
                {'content': '/media/test_multiplefile1', 'name': 'test_multiplefile1', 'mediaType': ''},
                {'content': '/media/test_multiplefile2', 'name': 'test_multiplefile2', 'mediaType': ''}
            ]
        )
        # 'multipleimage' to return list of dicts with values
        self.assertEqual(
            results[0]['data']['some_related_field'][0]['some_multipleimage'],
            [
                {'content': '/media/test_multipleimage1.jpg', 'name': 'test_multipleimage1.jpg', 'mediaType': ''},
                {'content': '/media/test_multipleimage2.jpg', 'name': 'test_multipleimage2.jpg', 'mediaType': ''}
            ]
        )
        # test 'fields_custom_handlers_mapping'. Return result custom handler
        self.assertEqual(
            results[0]['data']['some_related_field'][0]['some_binfile'],
            'bin file handled'
        )
        obj_with_valid_fields.delete()

        obj_with_invalid_namedbinfile = ModelWithBinaryFiles.objects.create(
            some_namedbinfile='\'',
        )
        obj_with_invalid_namedbinfile.related_model.add(related_model)

        results = self.bulk([
            {'method': 'get', 'path': ['test_json_file_image_fields_model', related_model.id]},
        ])
        self.assertEqual(
            results[0]['data']['some_related_field'][0]['some_namedbinfile'],
            {'content': None, 'mediaType': None, 'name': None}
        )

    def test_contenttype_nested_views(self):
        bulk_data = [
            {'method': 'post', 'path': ['vartype'], 'data': {'name': 'test', 'val_type': "text"}},
            {'method': 'post', 'path': ['testcontenttype'], 'data': {'name': 'test'}},
            {
                'method': 'post',
                'path': ['testcontenttype', '<<1[data][id]>>', 'vars'],
                'data': {
                    'key': '<<0[data][id]>>',
                    'value': 'test_val',
                }
            },
            {'method': 'get', 'path': ['testcontenttype', '<<1[data][id]>>', 'vars']},
            {
                'method': 'post',
                'path': ['testcontenttype', '<<1[data][id]>>', 'vars'],
                'data': {
                    'key': '<<0[data][id]>>',
                    'value': ''.join(map(str, range(12))),
                }
            },
            {'method': 'post', 'path': ['vartype'], 'data': {'name': 'test_int', 'val_type': "integer"}},
            {
                'method': 'post',
                'path': ['testcontenttype', '<<1[data][id]>>', 'vars'],
                'data': {
                    'key': '<<5[data][id]>>',
                    'value': '10',
                }
            },
            {
                'method': 'post',
                'path': ['testcontenttype', '<<1[data][id]>>', 'vars'],
                'data': {
                    'key': '<<5[data][id]>>',
                    'value': 'qwerty',
                }
            },
        ]
        results = self.bulk(bulk_data)
        self.assertEqual(results[1]['status'], 201, results[1])
        self.assertEqual(results[2]['status'], 201, results[2])
        self.assertEqual(results[3]['status'], 200, results[3])
        self.assertEqual(results[3]['data']['count'], 1, results[3])
        self.assertEqual(results[4]['status'], 400, results[4])
        self.assertEqual(results[4]['data'], {'value': ['Ensure this field has no more than 10 characters.']})
        self.assertEqual(results[5]['status'], 201, results[5])
        self.assertEqual(results[6]['status'], 201, results[6])
        self.assertEqual(results[7]['status'], 400, results[7])
        self.assertEqual(results[7]['data'], {'value': ['A valid integer is required.']})

    @override_settings(CASE_SENSITIVE_API_FILTER=False)
    def test_filters_case_insensitive(self):
        filters_data = [
            'tatata',
            'senS',
            'en',
            'Ins',
        ]

        [
            self._create_user(username=uname)
            for uname in ['Insensitive', 'insensitive', 'Sensitive', 'SenS']
        ]

        bulk_data = [
            dict(path=['user'], method='get', query=f'username={value}')
            for value in filters_data
        ]
        results = self.bulk(bulk_data)

        self.assertEqual(results[0]['status'], 200)
        self.assertCount(results[0]['data']['results'], 0)
        self.assertEqual(results[1]['status'], 200)
        self.assertCount(results[1]['data']['results'], 4)
        self.assertEqual(results[2]['status'], 200)
        self.assertCount(results[2]['data']['results'], 4)
        self.assertEqual(results[3]['status'], 200)
        self.assertCount(results[3]['data']['results'], 2)

    def test_smart_serializer(self):
        ModelWithBinaryFiles = self.get_model_class('test_proj.ModelWithBinaryFiles')
        class TestSerializer(serializers.VSTSerializer):
            class Meta:
                model = ModelWithBinaryFiles
                fields = [
                    'some_namedbinfile',
                    'some_namedbinimage',
                    'some_multiplenamedbinfile',
                    'some_multiplenamedbinimage',
                    'some_filefield',
                    'some_imagefield',
                    'some_FkModelfield',
                    'some_validatednamedbinimage',
                    'some_validatedmultiplenamedbinimage',
                    'some_FkModelfield'
                ]

        serializer = TestSerializer()

        def serializer_test(serializer):
            # correct serializer field class
            self.assertIsInstance(serializer.fields['some_filefield'], fields.NamedBinaryFileInJsonField)
            self.assertIsInstance(serializer.fields['some_imagefield'], fields.NamedBinaryImageInJsonField)
            # correct kwarg file=True
            self.assertTrue(serializer.fields['some_filefield'].file)
            self.assertTrue(serializer.fields['some_imagefield'].file)
            # correct serializer field classes
            self.assertIsInstance(serializer.fields['some_namedbinfile'], fields.NamedBinaryFileInJsonField)
            self.assertIsInstance(serializer.fields['some_namedbinimage'], fields.NamedBinaryImageInJsonField)
            self.assertIsInstance(
                serializer.fields['some_multiplenamedbinfile'],
                fields.MultipleNamedBinaryFileInJsonField
            )
            self.assertIsInstance(
                serializer.fields['some_multiplenamedbinimage'],
                fields.MultipleNamedBinaryImageInJsonField
            )
            self.assertIsInstance(serializer.fields['some_validatednamedbinimage'], fields.NamedBinaryImageInJsonField)
            self.assertIsInstance(serializer.fields['some_FkModelfield'], fields.FkModelField)
            # correct model selected
            self.assertEqual(
                serializer.fields['some_FkModelfield'].model_class,
                self.get_model_class('test_proj.Author')
            )

        # test manually created serializer
        serializer_test(serializer)
        # test generated serializer
        generated_serializer = ModelWithBinaryFiles.generated_view.serializer_class()
        serializer_test(generated_serializer)

    def test_deep_nested(self):
        results = self.bulk([
            # [0-2] Create 3 nested objects
            {'method': 'post', 'path': 'deep_nested_model', 'data': {'name': '1'}},
            {'method': 'post', 'path': ['deep_nested_model', '<<0[data][id]>>', 'deepnested'], 'data': {'name': '1.1'}},
            {'method': 'post', 'path': ['deep_nested_model', '<<1[data][id]>>', 'deepnested'], 'data': {'name': '1.1.1'}},
            # [3] Query all objects
            {'method': 'get', 'path': 'deep_nested_model'},
            # [4] Query root objects
            {'method': 'get', 'path': 'deep_nested_model', 'query': '__deep_parent='},
            # [5-7] Query nested objects
            {'method': 'get', 'path': 'deep_nested_model', 'query': '__deep_parent=<<0[data][id]>>'},
            {'method': 'get', 'path': 'deep_nested_model', 'query': '__deep_parent=<<1[data][id]>>'},
            {'method': 'get', 'path': 'deep_nested_model', 'query': '__deep_parent=<<2[data][id]>>'},
            # [8] Check that DeepViewFilterBackend has no effect on detail view
            {'method': 'get', 'path': ['deep_nested_model', '<<0[data][id]>>'], 'query': '__deep_parent='},
        ])
        self.assertEqual(results[3]['data']['count'], 3)
        self.assertEqual(results[4]['data']['results'], [results[0]['data']])
        self.assertEqual(results[5]['data']['results'], [results[1]['data']])
        self.assertEqual(results[6]['data']['results'], [results[2]['data']])
        self.assertEqual(results[7]['data']['results'], [])
        self.assertEqual(results[8]['data'], results[0]['data'])


class CustomModelTestCase(BaseTestCase):
    def test_custom_models(self):
        qs = File.objects.filter(name__in=['ToFilter', 'ToExclude'])
        qs = qs.exclude(name='ToExclude', invalid='incorrect').order_by('for_order1', '-for_order2', 'pk').reverse()

        self.assertEqual(qs.count(), 5)
        self.assertEqual(qs.exists(), True)

        origin_pos_arr = [6, 7, 8, 0, 9]
        origin_pos_arr.reverse()
        counter = 0
        for file_obj in qs.all():
            self.assertEqual(
                file_obj.origin_pos, origin_pos_arr[counter],
                [dict(origin_pos=i.origin_pos, for_order1=i.for_order1, for_order2=i.for_order2)
                 for i in qs]
            )
            counter += 1

        self.assertEqual(qs.none().count(), 0)
        test_obj = qs.get(pk=6)
        self.assertEqual(test_obj.name, 'ToFilter')
        self.assertEqual(test_obj.origin_pos, 6)
        with self.assertRaises(test_obj.MultipleObjectsReturned):
            qs.get(name__in=['ToFilter', 'ToExclude'])
        with self.assertRaises(test_obj.DoesNotExist):
            qs.get(name='incorrect')

        list_qs = List.objects.all()
        self.assertEqual(list_qs.count(), 100)
        self.assertEqual(len(list(list_qs[1:50])), 49)

        self.assertEqual(qs.last().origin_pos, 6)
        self.assertEqual(qs.first().origin_pos, 9)

        self.assertTrue(File.objects.all()[1:2].query['low_mark'], 1)
        self.assertTrue(File.objects.all()[1:2].query['high_mark'], 2)

    def test_custom(self):
        results = self.bulk([
            dict(method='get', path='files'),
            dict(method='get', path=['files', 1]),
            dict(method='get', path='files', query='name=ToFilter'),
            dict(method='get', path='listoffiles'),
        ])

        for result in results:
            self.assertEqual(result['status'], 200, result)

        self.assertEqual(results[0]['data']['count'], 10)
        self.assertEqual(results[1]['data']['origin_pos'], 1, results[1]['data'])
        self.assertEqual(results[2]['data']['count'], 5)
        self.assertEqual(results[3]['data']['count'], 1)

        self.client.force_login(self.user)
        last_update = datetime.datetime(2021, 3, 1, 16, 15, 51, 801564).timestamp()
        response = self.client.get('/api/v1/listoffiles/0/', HTTP_ACCEPT_ENCODING='gzip')
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response, FileResponse)
        self.assertEqual(response.as_attachment, True)
        self.assertEqual(response.filename, 'File_0.txt')
        self.assertEqual(
            gzip.decompress(b''.join(response.streaming_content)).decode('utf-8'),
            'File data'
        )

        # Check browser cache
        response = self.client.get('/api/v1/listoffiles/0/', HTTP_IF_NONE_MATCH=str(last_update))
        self.assertEqual(response.status_code, 304)
        self.assertIsInstance(response, HttpResponseNotModified)

    def test_additional_urls(self):
        response = self.client.get('/suburls/admin/login/')
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, self.login_url)
        response = self.client.get('/suburls_module/admin/login/')
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, self.login_url)
        response = self.client.get(f'/suburls/login/')
        self.assertEqual(response.status_code, 302)


class ToolsTestCase(BaseTestCase):
    databases = '__all__'

    def test_health_page(self):
        result = self.get_result('get', '/api/health/')
        self.assertIn('db', result)
        self.assertIn('cache', result)
        self.assertIn('rpc', result)
        self.assertEqual(result['db'], 'ok')
        self.assertEqual(result['cache'], 'ok')
        self.assertEqual(result['rpc'], 'ok')

        with self.patch('django.db.backends.base.base.BaseDatabaseWrapper.ensure_connection') as mock:
            def error_in_connection(*args, **kwargs):
                raise Exception('test')

            mock.side_effect = error_in_connection
            response = self.client.get('/api/health/')
            self.assertRCode(response, 500)
            result = self.render_api_response(response)
            self.assertNotEqual(result['db'], 'ok')
            self.assertEqual(result['db'], 'test')

        with self.patch('vstutils.utils.BaseVstObject.get_django_settings') as mock:
            def get_django_settings_mock(name, default=None):
                if name != 'RPC_ENABLED':
                    return self._settings(name, default)
                return False

            mock.side_effect = get_django_settings_mock
            response = self.client.get('/api/health/')
            self.assertRCode(response, 200)
            result = self.render_api_response(response)
            self.assertNotEqual(result['rpc'], 'ok')
            self.assertEqual(result['rpc'], 'disabled')


class ConfigParserCTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()
        self._maxDiff = self.maxDiff
        self.maxDiff = 4096

    def tearDown(self) -> None:
        super().tearDown()
        self.maxDiff = self._maxDiff

    def test_file_reader(self):
        # CHECK SETTINGS FROM CONFIG FILE
        db_default_val = {
            'OPTIONS': {
                'timeout': 20,
                # 'check_same_thread': True,
            },
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': 'file:memorydb_default?mode=memory&cache=shared',
            'TEST': {
                'SERIALIZE': False,
                'CHARSET': None,
                'COLLATION': None,
                'NAME': None,
                'MIRROR': None
            },
            'ATOMIC_REQUESTS': False,
            'AUTOCOMMIT': True,
            'CONN_MAX_AGE': 0,
            'TIME_ZONE': None,
            'USER': '',
            'PASSWORD': '',
            'HOST': '',
            'PORT': ''
        }
        if django_version[0] >= 3 and django_version[1] in (1, 2):  # nocv
            db_default_val['TEST']['MIGRATE'] = True

        self.assertEqual(settings.ALLOWED_HOSTS, ['*', 'testserver'])

        self.assertEqual(settings.LDAP_SERVER, None)
        self.assertEqual(settings.LDAP_DOMAIN, '')
        self.assertEqual(settings.LDAP_FORMAT, 'cn=<username>,<domain>')
        self.assertEqual(settings.TIME_ZONE, "UTC")
        self.assertEqual(settings.ENABLE_ADMIN_PANEL, False)

        self.assertEqual(settings.SESSION_COOKIE_AGE, 1209600)
        self.assertEqual(settings.STATIC_URL, '/static/')
        self.assertEqual(settings.PAGE_LIMIT, 20)
        self.assertEqual(settings.SWAGGER_API_DESCRIPTION, None)
        self.assertEqual(settings.SCHEMA_CACHE_TIMEOUT, 120)
        self.assertEqual(settings.ENABLE_GRAVATAR, True)

        self.assertEqual(settings.WEB_DAEMON, True)
        self.assertEqual(settings.WEB_DAEMON_LOGFILE, '/dev/null')
        self.assertEqual(settings.WEB_ADDRPORT, ':8080')

        for key in db_default_val.keys():
            self.assertEqual(settings.DATABASES['default'][key], db_default_val[key])

        self.assertEqual(settings.EMAIL_PORT, 25)
        self.assertEqual(settings.EMAIL_HOST_USER, "")
        self.assertEqual(settings.EMAIL_HOST_PASSWORD, "")
        self.assertEqual(settings.EMAIL_USE_TLS, False)
        self.assertEqual(settings.EMAIL_HOST, None)

        self.assertEqual(settings.REST_FRAMEWORK['PAGE_SIZE'], 1000)

        self.assertEqual(settings.CELERY_BROKER_URL, "filesystem://")
        self.assertEqual(settings.CELERY_WORKER_CONCURRENCY, 4)
        self.assertEqual(settings.CELERYD_PREFETCH_MULTIPLIER, 1)
        self.assertEqual(settings.CELERYD_MAX_TASKS_PER_CHILD, 1)
        self.assertEqual(settings.CELERY_BROKER_HEARTBEAT, 10)
        self.assertEqual(settings.CELERY_RESULT_EXPIRES, 1)
        self.assertEqual(settings.CREATE_INSTANCE_ATTEMPTS, 10)
        self.assertEqual(settings.CONCURRENCY, 4)

        worker_options = {
            'app': 'test_proj.wapp:app',
            'loglevel': 'WARNING',
            'logfile': '/var/log/test_proj2/worker.log',
            'pidfile': '/run/test_proj_worker.pid',
            'autoscale': '4,1',
            'hostname': f'{pwd.getpwuid(os.getuid()).pw_name}@%h',
            'beat': True
        }
        self.assertDictEqual(worker_options, settings.WORKER_OPTIONS)


@override_settings(CENTRIFUGO_CLIENT_KWARGS={
    'address': 'http://localhost:8000',
    'api_key': "XXX"
})
class WebSocketTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()

        self.client = self._login()
        self.cookie = f"{self.client.cookies.output(header='', sep='; ').strip()};"
        self.cookie += f"csrftoken={_get_new_csrf_token()}"

        self.headers_dict = {
            'host': f'{self.server_name}',
            'connection': 'Upgrade',
            'pragma': 'no-cache',
            'cache-control': 'no-cache',
            'user-agent': (
                'Mozilla/5.0 (X11; Linux x86_64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/81.0.4044.138 Safari/537.36'
            ),
            'upgrade': 'websocket',
            'origin': f"https://{self.server_name}",
            'sec-websocket-version': '13',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'en-US,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'sec-websocket-key': 'some_key',
            'sec-websocket-extensions': 'permessage-deflate; client_max_window_bits'
        }

    def test_centrifugo_notification(self):
        global cent_client
        mock_args, mock_kwargs, mock_call_count = [], [], 0

        def publish(*args, **kwargs):
            nonlocal mock_args, mock_kwargs, mock_call_count
            mock_call_count += 1
            mock_args.append(args)
            mock_kwargs.append(kwargs)

        Host = self.get_model_class('test_proj.models.Host')
        Group = self.get_model_class('auth.Group')
        models.cent_client = get_centrifugo_client()
        models.cent_client._send = publish

        host_obj = Host.objects.create(name="centrifuga")
        host_obj2 = Host.objects.create(name="centrifuga")
        Host.objects.filter(id__in=[host_obj.id, host_obj2.id]).delete()
        Group.objects.create(name='TestUsersGroup').delete()
        self.assertEqual(mock_call_count, 4)
        mock_data = []
        for arg in mock_args:
            cent_host = arg[0]
            arg = json.loads(arg[-1])
            self.assertEqual(arg['method'], 'publish')
            mock_data.append((cent_host, arg['params']['channel'], arg['params']['data']))
        self.assertEqual(mock_data[0][1], 'subscriptions_update')
        self.assertEqual(mock_data[1][1], 'subscriptions_update')
        self.assertEqual(mock_data[2][1], 'subscriptions_update')
        self.assertEqual(mock_data[3][1], 'subscriptions_update')
        self.assertDictEqual(mock_data[0][2], {"subscribe-label": Host._meta.label, "pk": host_obj.id})
        self.assertDictEqual(mock_data[1][2], {"subscribe-label": Host._meta.label, "pk": host_obj2.id})
        self.assertDictEqual(mock_data[2][2], {"subscribe-label": Host._meta.label, "pk": host_obj2.id})
        self.assertDictEqual(mock_data[3][2], {"subscribe-label": Host._meta.label, "pk": host_obj.id})


class ThrottleTestCase(BaseTestCase):
    def throttle_requests(self):
        test_post = {
            'title': 'test_post',
            'text': 'test_post_text'
        }
        results = self.bulk([
            {'method': 'post', 'path': ['author'], 'data': {'name': 'test_author'}},
            {'method': 'post', 'path': ['author', '<<0[data][id]>>', 'post'], 'data': test_post},
            {'method': 'put', 'path': ['author', '<<0[data][id]>>', 'post', '<<1[data][id]>>'], 'data': test_post},
            {'method': 'put', 'path': ['author', '<<0[data][id]>>', 'post', '<<1[data][id]>>'], 'data': test_post},
            {'method': 'delete', 'path': ['author', '<<0[data][id]>>', 'post', '<<1[data][id]>>']},
            {'method': 'patch', 'path': ['author', '<<0[data][id]>>', 'post', '<<1[data][id]>>'], 'data': {'title': 'patched'}},
            {'method': 'post', 'path': ['author'], 'data': {'name': 'author_2'}},
            {'method': 'get', 'path': ['author'], 'query': 'name=test_author'},
            {'method': 'get', 'path': ['user', 'profile']},
        ])
        return results

    def test_throttle_none(self):
        results = self.throttle_requests()
        # test post to an outer viewset(not throttled)
        self.assertEqual(201, results[0]['status'])
        # test post to inner viewset(not throttled)
        self.assertEqual(201, results[1]['status'])
        # test put to inner viewset(not throttled)
        self.assertEqual(200, results[2]['status'])
        # test put to inner viewset(not throttled)
        self.assertEqual(200, results[3]['status'])
        # test delete to inner viewset(not throttled)
        self.assertEqual(204, results[4]['status'])

    @patch(
        'vstutils.api.throttling.ActionBasedThrottle.throttle_rates',
        new_callable=PropertyMock,
    )
    def test_throttle_from_settings(self, mock_throttle_rate):
        test_throttle_conf = {
            'rate': '1/day',
            'actions': 'list, create, update, destroy',
            'views': {
                'post': {
                    'rate': '3/day',
                    'actions': 'create, update, destroy'
                },
                'user': {
                    'rate': '0/day',
                    'actions': 'retrieve'
                }
            }
        }
        mock_throttle_rate.return_value = test_throttle_conf
        results = self.throttle_requests()
        # test post to an outer viewset(1/1)
        self.assertEqual(201, results[0]['status'])
        # test post to inner viewset(1/3)
        self.assertEqual(201, results[1]['status'])
        # test put to inner viewset(2/3)
        self.assertEqual(200, results[2]['status'])
        # test put to inner viewset(3/3)
        self.assertEqual(200, results[3]['status'])
        # test delete to inner viewset(4/3), gets throttled
        self.assertEqual(429, results[4]['status'])
        # test patch to inner viewset(not throttled)
        self.assertEqual(200, results[5]['status'])
        # test post to an outer viewset(2/1), gets throttled
        self.assertEqual(429, results[6]['status'])
        # test list to outer viewset with query params(throttled)
        self.assertEqual(429, results[7]['status'])
        # test retrieve to user viewset(throttled)
        self.assertEqual(429, results[8]['status'])
        not_thottled = self.bulk(
            {'method': 'get', 'path': ['user', 'profile*']}
        )
        thottled = self.bulk(
            {'method': 'get', 'path': ['user', 'profile%']}
        )
        # no throttling because of unparsed url
        self.assertEqual(not_thottled[0]['status'], 404)
        # throttled
        self.assertEqual(thottled[0]['status'], 429)


    @patch(
        'vstutils.api.throttling.ActionBasedThrottle.throttle_rates',
        new_callable=PropertyMock,
        return_value={'rate': '0/day', 'actions': 'create', 'views': {}}
    )
    def test_anonymous_user_throttle(self, mock_throttle_rate):
        c = self.client
        c.logout()
        response = c.post(
            '/api/v1/author/',
            {
                'name': 'author_1'
            }
        )
        self.assertEqual(429, response.status_code)
