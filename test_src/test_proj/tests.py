# pylint: disable=import-error,invalid-name,no-member,function-redefined,unused-import
import os
import sys
import shutil
import re
import io
import pwd
from pathlib import Path

try:
    from mock import patch
except ImportError:  # nocv
    from unittest.mock import patch

from collections import OrderedDict

from asgiref.sync import async_to_sync
from django.conf import settings
from django.core import mail
from django.core.management import call_command
from django.middleware.csrf import _get_new_csrf_token
from django.test import Client
from fakeldap import MockLDAP
from requests.auth import HTTPBasicAuth
from rest_framework.test import CoreAPIClient
from channels.testing import WebsocketCommunicator

from vstutils import utils, __version__
from vstutils.api.validators import RegularExpressionValidator
from vstutils.api.auth import UserViewSet
from vstutils.exceptions import UnknownTypeException
from vstutils.ldap_utils import LDAP
from vstutils.templatetags.vst_gravatar import get_user_gravatar
from vstutils.tests import BaseTestCase, json, override_settings
from vstutils.urls import router
from vstutils.ws import application

from .models import File, Host, HostGroup, List
from rest_framework.exceptions import ValidationError
from base64 import b64encode

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
        "@babel/core": "^7.8.7",
        "@babel/preset-env": "^7.8.7",
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
        "webpack": "^4.42.1",
        "webpack-bundle-analyzer": "^3.6.0",
        "webpack-cli": "^3.3.11"
    }
}


def async_test(coro):
    return async_to_sync(coro, force_new_loop=True)


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
        self.client.post('/login/', data=data, HTTP_X_AUTH_PLUGIN='DJANGO')
        response = client.get('/api/v1/user/')
        self.assertNotEqual(response.status_code, 200)
        response = self.client.post("/logout/")
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
            if TestClass.test2 == 'Some text':
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


class ViewsTestCase(BaseTestCase):

    def test_main_views(self):
        # Main
        self.get_result('get', '/')
        self.get_result('post', '/logout/', 302)
        self.get_result('post', '/login/', 302)
        self.get_result('get', '/login/', 302)
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
        self.post_result(
            '/api/v1/user/', data=dict(username=self.user.username), code=409
        )
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
        invalid_old_password = json.dumps(dict(
            old_password='1', password='2', password2='2'
        ))
        self.get_result(
            'post', '/api/v1/user/{}/change_password/'.format(self.user.id),
            data=invalid_old_password, code=403
        )
        not_identical_passwords = json.dumps(dict(
            old_password=self.user.data['password'], password='2', password2='3'
        ))
        self.get_result(
            'post', '/api/v1/user/{}/change_password/'.format(self.user.id),
            data=not_identical_passwords, code=400
        )
        update_password = json.dumps(dict(
            old_password=self.user.data['password'], password='12345', password2='12345'
        ))
        self.get_result(
            'post', '/api/v1/user/{}/change_password/'.format(self.user.id),
            data=update_password
        )
        self.change_identity(True)
        data = [
            dict(username="USER{}".format(i), password="123", password2="123")
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
        response = client.post('/login/', {'username': test_user.username, 'password': test_user.password})
        self.assertEqual(response.status_code, 200)
        response = client.post('/logout/')
        self.assertEqual(response.status_code, 302)
        response = client.post('/password_reset/', {'email': 'error@error.error'})
        self.assertEqual(response.status_code, 302)
        self.assertCount(mail.outbox, 0)
        response = client.post('/password_reset/', {'email': test_user.email})
        self.assertEqual(response.status_code, 302)
        regex = r"^http(s)?:\/\/.*$"
        match = re.search(regex, mail.outbox[-1].body, re.MULTILINE)
        href = match.group(0)
        response = client.post(href, {'new_password1': 'newpass', 'new_password2': 'newpass'})
        self.assertEqual(response.status_code, 302)
        response = client.post('/login/', {'username': test_user.username, 'password': 'newpass'})
        self.assertEqual(response.status_code, 200)

    def test_register_new_user(self):
        user = dict(username='newuser', password1='pass', password2='pass', email='new@user.com')
        user_fail = dict(username='newuser', password1='pass', password2='pss', email='new@user.com')
        client = self.client_class()
        response = client.post('/login/', {'username': user['username'], 'password': user['password1']})
        self.assertEqual(response.status_code, 200)
        response = client.post('/registration/', data=user_fail)
        self.assertEqual(response.status_code, 200)
        response = client.post('/registration/', data=user)
        self.assertRedirects(response, '/login/')
        response = client.post('/login/', {'username': user['username'], 'password': user['password2']})
        self.assertRedirects(response, '/')

    def test_login_redirects(self):
        user = self._create_user(is_super_user=False)
        client = self.client_class()
        redirect_page = '/#/user/1/notification_settings'

        # Test that login POST handler redirects after successful login
        response = client.post('/login/', {
            'username': user.data['username'],
            'password': user.data['password'],
            'next': redirect_page
        })
        self.assertRedirects(response, redirect_page)


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
        result = self.bulk(bulk_request_data)

        self.assertEqual(result[0]['status'], 204)
        self.assertEqual(result[1]['status'], 404)
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

    def test_get_openapi(self):
        api = self.get_result('get', '/api/endpoint/?format=openapi', 200)

        self.assertEqual(api['info']['title'], 'Example Project')
        self.assertTrue('basePath' in api, api.keys())
        self.assertTrue('paths' in api, api.keys())
        self.assertTrue('host' in api, api.keys())
        self.assertTrue('definitions' in api, api.keys())
        self.assertTrue('schemes' in api, api.keys())
        self.assertTrue('application/json' in api['consumes'], api['consumes'])
        self.assertTrue('application/json' in api['produces'], api['produces'])

        client = self._login()
        response = client.get('/api/endpoint/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'drf-yasg/swagger-ui.html')
        with self.assertRaises(ValueError):
            json.loads(response.content.decode('utf-8'))


class EndpointTestCase(BaseTestCase):

    def test_auth(self):
        response = self.client_class().get('/api/endpoint/?format=openapi')
        self.assertEqual(response.status_code, 200)

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
        self.assertEqual(response[4]['data'], {'filter_applied': 1, 'id': 2, 'local_filter_applied': 1, 'name': 5})
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
            return method, self.last_response._headers['server-timing'][1].split(', ')[0].split('=')[-1]

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

    def test_regexp_validator(self):
        regexp_validator = RegularExpressionValidator(re.compile(r'^valid$'))

        with self.assertRaises(ValidationError):
            regexp_validator('not valid')

        regexp_validator('valid')


class LangTestCase(BaseTestCase):

    def test_lang(self):
        bulk_data = [
            dict(path=['_lang'], method='get'),
            dict(path=['_lang', 'ru'], method='get'),
            dict(path=['_lang', 'en'], method='get'),
            dict(path=['_lang', 'unkn'], method='get'),
            dict(path=['_lang', 'uk'], method='get'),
        ]
        results = self.bulk(bulk_data)
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['count'], 3)

        self.assertEqual(results[1]['data']['code'], 'ru')
        self.assertEqual(results[1]['data']['name'], 'Russian')
        self.assertEqual(results[1]['data']['translations']['Hello world!'], 'Привет мир!')
        self.assertFalse('Unknown string' in results[1]['data']['translations'])

        self.assertEqual(results[2]['data']['code'], 'en')
        self.assertEqual(results[2]['data']['name'], 'English')

        self.assertFalse('Hello world!' in results[3]['data']['translations'])

        self.assertEqual(results[4]['data']['code'], 'uk')
        self.assertEqual(results[4]['data']['name'], 'Empty list')
        self.assertEqual(results[4]['data']['translations'], {})


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
        suburls = '/'.join(['{}/{}'.format(s, i) for s, i in args])
        url = self.get_url('hosts', id, suburls)
        result = self.get_result('get', url)
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
            dict(method='get', path=['hosts', host_group_id, 'shost', '<<14[data][id]>>', 'test']),
            dict(method='get', path=['hosts', host_group_id, 'shost', '<<14[data][id]>>', 'test2']),
            dict(method='get', path=['hosts', host_group_id, 'shost', '<<14[data][id]>>', 'test3']),
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
        self.assertEqual(hostgroup_props['parent']['format'], 'autocomplete')
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

    def test_model_namedbinfile_field(self):
        value = {'name': 'abc.png', 'content': '/4sdfsdf/'}
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
        ]
        results = self.bulk(bulk_data)
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200, results[0])
        self.assertEqual(results[1]['data']['some_binfile'], '')
        self.assertEqual(results[1]['data']['some_namedbinfile'], dict(name=None, content=None))
        self.assertEqual(results[1]['data']['some_namedbinimage'], dict(name=None, content=None))
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

    def test_contenttype_nested_views(self):
        bulk_data = [
            {'method': 'post', 'path': ['testcontenttype'], 'data': {'name': 'test'}},
            {'method': 'post', 'path': ['testcontenttype', '<<0[data][id]>>', 'vars'], 'data': {'value': 'test_val'}},
            {'method': 'get', 'path': ['testcontenttype', '<<0[data][id]>>', 'vars']},
        ]
        results = self.bulk(bulk_data)
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data']['count'], 1)

class CustomModelTestCase(BaseTestCase):
    def test_custom_models(self):
        qs = File.objects.filter(name__in=['ToFilter', 'ToExclude'])
        qs = qs.exclude(name='ToExclude', invalid='incorrect').order_by('for_order1', '-for_order2').reverse()

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
        ])

        for result in results:
            self.assertEqual(result['status'], 200, result)

        self.assertEqual(results[0]['data']['count'], 10)
        self.assertEqual(results[1]['data']['origin_pos'], 1, results[1]['data'])
        self.assertEqual(results[2]['data']['count'], 5)

    def test_additional_urls(self):
        response = self.client.get('/suburls/admin/login/')
        self.assertEqual(response.status_code, 302)
        response = self.client.get('/suburls_module/admin/login/')
        self.assertEqual(response.status_code, 302)
        response = self.client.get('/suburls/login/')
        self.assertEqual(response.status_code, 302)


class ToolsTestCase(BaseTestCase):
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
                'SERIALIZE': False, 'CHARSET': None, 'COLLATION': None, 'NAME': None,
                'MIRROR': None
            },
            'ATOMIC_REQUESTS': False, 'AUTOCOMMIT': True, 'CONN_MAX_AGE': 0,
            'TIME_ZONE': None, 'USER': '', 'PASSWORD': '', 'HOST': '', 'PORT': ''
        }

        self.assertEqual(settings.ALLOWED_HOSTS, ['*', 'testserver'])

        self.assertEqual(settings.LDAP_SERVER, None)
        self.assertEqual(settings.LDAP_DOMAIN, '')
        self.assertEqual(settings.LDAP_FORMAT, 'cn=<username>,<domain>')
        self.assertEqual(settings.TIME_ZONE, "UTC")
        self.assertEqual(settings.ENABLE_ADMIN_PANEL, False)

        self.assertEqual(settings.SESSION_COOKIE_AGE, 1209600)
        self.assertEqual(settings.STATIC_URL, '/static/')
        self.assertEqual(settings.PAGE_LIMIT, 1000)
        self.assertEqual(settings.SWAGGER_API_DESCRIPTION, None)
        self.assertEqual(settings.OPENAPI_PUBLIC, False)
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
            'user-agent': ('Mozilla/5.0 (X11; Linux x86_64) '
                          'AppleWebKit/537.36 (KHTML, like Gecko) '
                          'Chrome/81.0.4044.138 Safari/537.36'),
            'upgrade': 'websocket',
            'origin': f"https://{self.server_name}",
            'sec-websocket-version': '13',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'en-US,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'sec-websocket-key': 'some_key',
            'sec-websocket-extensions': 'permessage-deflate; client_max_window_bits'
        }

    @async_test
    async def test_endpoint_requests(self):
        headers = {
            k.encode('utf-8'): v.encode('utf-8')
            for k, v in self.headers_dict.items()
        }
        endpoint_communicator = WebsocketCommunicator(application, "/ws/endpoint/", headers=headers.items())
        connected, subprotocol = await endpoint_communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(subprotocol, 1008)
        endpoint_communicator.stop()

        headers[b'cookie'] = self.cookie.encode('utf-8')
        endpoint_communicator = WebsocketCommunicator(application, "/ws/endpoint/", headers=headers.items())

        def _default_manager_get(pk=None, *args, **kwargs):
            if pk == self.user.id:
                return self.user
            raise self.user.DoesNotExists()  # nocv


        with self.patch('vstutils.auth.UserModel._default_manager.get') as mock:
            mock.side_effect = _default_manager_get
            connected, _ = await endpoint_communicator.connect()
            self.assertTrue(connected)
            # initial message
            response = await endpoint_communicator.receive_json_from(3)
            self.assertEqual(response['type'], 'bootstrap')
            self.assertEqual(response['data']['debug_mode'], settings.DEBUG)
            self.assertEqual(
                response['data']['version'],
                f'1.0.0_1.0.0_{__version__}_{self.user.id}'
            )
            self.assertEqual(
                response['data']['endpoint_path'],
                f'http://{self.server_name}/api/endpoint/'
            )
            self.assertEqual(
                response['data']['static'],
                [
                    {
                        "priority": f.get('priority', 999999),
                        "type": f['type'],
                        "name": f"http://{self.server_name}/{f['name']}"
                    }
                    for f in settings.SPA_STATIC
                ]
            )

            with self.patch('django.contrib.auth.models.User.objects.get') as mk:
                mk.side_effect = _default_manager_get
                await endpoint_communicator.send_json_to({
                    "data": [
                        {"method": "get", "path": ['user', self.user.id]}
                    ],
                    "handler_type": "put",
                    "request_id": 123
                })
            response = await endpoint_communicator.receive_json_from(3)
            self.assertEqual(response['status'], 200)
            self.assertEqual(response['request_id'], 123)
            await endpoint_communicator.send_json_to({"handler_type": "get"})
            response = await endpoint_communicator.receive_json_from(3)
            self.assertEqual(response['type'], 'schema')
            self.assertTrue('swagger' in response['schema'], response['schema'])
            self.assertEqual(response['schema']['swagger'], '2.0')
            await endpoint_communicator.disconnect()
