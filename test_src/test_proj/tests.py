# pylint: disable=import-error,invalid-name,no-member,function-redefined,unused-import
import os
import sys
import shutil
import re
import pwd

import pyximport

pyximport.install()

import six
try:
    from mock import patch
except ImportError:  # nocv
    from unittest.mock import patch

from fakeldap import MockLDAP
from django.test import Client
from django.core.management import call_command
from django.core import mail
from django.conf import settings
from requests.auth import HTTPBasicAuth
from rest_framework.test import CoreAPIClient
from vstutils.tests import BaseTestCase, json, override_settings
from vstutils.urls import router
from vstutils.api.views import UserViewSet
from vstutils import utils
from vstutils.exceptions import UnknownTypeException
from vstutils.ldap_utils import LDAP
from vstutils.templatetags.vst_gravatar import get_user_gravatar
from vstutils.tools import get_file_value, File as ToolsFile
from vstutils.config import ConfigParserC, Section, IntType, BoolType, IntSecondsType, ListType, JsonType, StrType, ConfigParserException
from .models import Host, HostGroup, File, List


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
        out = six.StringIO()
        call_command(
            'newproject', '--name', 'test_project', interactive=0, dir='/tmp', stdout=out
        )
        self.assertIn(
            'Project successfully created at {}.'.format(self.project_place),
            out.getvalue()
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
        self.remove_project_place(self.project_place)
        with self.assertRaises(Exception):
            call_command('newproject', '--name', 'test_project', dir=None, interactive=0)

    def test_dockerrun(self):
        with self.patch('subprocess.check_call') as mock_obj:
            mock_obj.side_effect = lambda *args, **kwargs: 'OK'
            call_command('dockerrun')
            self.maxDiff = 1024*100
            self.assertEqual(mock_obj.call_count, 2)
            self.assertEqual(
                mock_obj.call_args[0][0],
                [
                    sys.executable, '-m', 'test_proj', 'web',
                    # 'processes=%k',
                    # 'threads=%k',
                    'thread-stacksize=40960',
                    'max-requests=50000',
                    'limit-as=512',
                    'harakiri=120',
                    'vacuum',
                    'pidfile=/run/web.pid'
                ]
            )
            mock_obj.reset_mock()

            def check_call_error(*args, **kwargs):
                raise Exception('Test exception.')

            mock_obj.side_effect = check_call_error
            with self.assertRaises(SystemExit):
                call_command('dockerrun', attempts=1)


class VSTUtilsTestCase(BaseTestCase):

    def _get_test_ldap(self, client, data):
        self.client.post('/login/', data=data)
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
        class TestClass(object):
            val = ''
            def __init__(self):
                self.val = "init"

            @utils.classproperty
            def test(self):
                return self.val

            @test.setter
            def test(self, value):
                self.val = value

        test_obj = TestClass()
        self.assertEqual(TestClass.test, "")
        self.assertEqual(test_obj.test, "init")
        test_obj.test = 'test'
        self.assertEqual(test_obj.val, 'test')


    def test_paginator(self):
        qs = self.get_model_filter('django.contrib.auth.models.User').order_by('email')
        for _ in utils.Paginator(qs, chunk_size=1).items():
            pass

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


class ViewsTestCase(BaseTestCase):

    def test_main_views(self):
        # Main
        self.get_result('get', '/')
        self.get_result('post', '/logout/', 302)
        self.get_result('post', '/login/', 302)
        self.get_result('get', '/login/', 302)
        # API
        keys = list(self.get_result('get', '/api/').keys())
        for key in ['openapi', 'v1']:
            self.assertIn(key, keys)
        self.assertEqual(
            list(self.get_result('get', '/api/v1/').keys()).sort(),
            list(self.settings_obj.API[self.settings_obj.VST_API_VERSION].keys()).sort()
        )
        # 404
        self.get_result('get', '/api/v1/some/', code=404)
        self.get_result('get', '/other_invalid_url/', code=404)
        self.get_result('get', '/api/user/', code=404)
        self.get_result('get', '/api/v1/user/1000/', code=404)

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

    def test_users_api(self):
        self.list_test('/api/v1/user/', 1)
        self.details_test(
            '/api/v1/user/{}/'.format(self.user.id),
            username=self.user.username, id=self.user.id
        )
        self.get_result('delete', '/api/v1/user/{}/'.format(self.user.id), 409)

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
        result = self.get_result('get', '/api/v1/user/{}/'.format(result['id']))
        self.assertCheckDict(user_data, result)
        self.get_result('patch', '/api/v1/user/', 405, data=dict(email=""))
        result = self.get_result('get', '/api/v1/user/{}/'.format(result['id']))
        self.assertCheckDict(user_data, result)
        user_data['first_name'] = 'new'
        post_data_dict = dict(partial=True, **user_data)
        self._check_update(
            '/api/v1/user/{}/'.format(result['id']), post_data_dict,
            method='put', **user_data
        )
        del post_data_dict['partial']
        post_data_dict['email'] = "skldjfnlkjsdhfljks"
        post_data_dict['password'] = "skldjfnlkjsdhfljks"
        post_data = json.dumps(post_data_dict)
        self.get_result(
            'patch', '/api/v1/user/{}/'.format(result['id']), data=post_data, code=400
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


class DefaultBulkTestCase(BaseTestCase):

    def test_bulk(self):
        self.get_model_filter(
            'django.contrib.auth.models.User'
        ).exclude(pk=self.user.id).delete()
        self.details_test(
            '/api/v1/_bulk/',
            operations_types=list(self.settings_obj.BULK_OPERATION_TYPES.keys())
        )
        data = [
            dict(username="USER{}".format(i), password="123", password2='123')
            for i in range(10)
        ]
        users_id = self.mass_create('/api/v1/user/', data, 'username')
        test_user = dict(username=self.random_name(), password='123', password2='123')
        userself_data = dict(first_name='me')
        bulk_request_data = [
            # Check code 204
            {'type': 'del', 'item': 'user', 'pk': users_id[0]},
            # Check code 404
            {'type': 'del', 'item': 'user', 'pk': 0},
            # Check 201 and username
            {'type': 'add', 'item': 'user', 'data': test_user},
            # Check update first_name by self
            {'type': 'set', 'item': 'user', 'pk': self.user.id, 'data': userself_data},
            # Check mods to view detail
            {
                'type': 'mod', 'item': 'settings', "method": "get",
                'data_type': ["system"]
            },
            # Check bulk-filters
            {
                'type': 'get', 'item': 'user',
                'filters': 'id={}'.format(','.join([str(i) for i in users_id]))
            },
            # Check `__init__` mod as default
            {"method": "get", 'data_type': ["settings", "system"]},
            {"method": "get", 'data_type': ["user", self.user.id]},
            {"method": "get", 'data_type': ["user"]},
            # Check json in data fields
            {
                'method': "post", 'data_type': ['user'],
                'data': {
                    "username": 'ttt',
                    'password': 'ttt333',
                    'password2': 'ttt333',
                    'first_name': json.dumps({"some": 'json'})
                }
            },
            {"method": 'get', 'data_type': ['usr', self.user.id]}
        ]
        self.get_result(
            "post", "/api/v1/_bulk/", 400, data=json.dumps(bulk_request_data)
        )
        result = self.get_result(
            "put", "/api/v1/_bulk/", 200, data=json.dumps(bulk_request_data)
        )
        self.assertEqual(result[0]['status'], 204)
        self.assertEqual(result[1]['status'], 404)
        self.assertEqual(result[2]['status'], 201)
        self.assertEqual(result[2]['data']['username'], test_user['username'])
        self.assertEqual(result[3]['status'], 200)
        self.assertEqual(result[3]['data']['first_name'], userself_data['first_name'])
        self.assertEqual(result[4]['status'], 200)
        self.assertEqual(result[4]['data']['PY'], self.settings_obj.PY_VER)
        self.assertEqual(result[5]['status'], 200)
        self.assertEqual(result[5]['data']['count'], len(users_id)-1)
        self.assertEqual(result[6]['status'], 200)
        self.assertEqual(result[6]['data']['PY'], self.settings_obj.PY_VER)
        self.assertEqual(result[7]['status'], 200)
        self.assertEqual(result[7]['data']['id'], self.user.id)
        self.assertEqual(result[8]['status'], 200)
        self.assertEqual(result[9]['status'], 201, result[9])
        self.assertEqual(result[10]['status'], 404, result[10])

        bulk_request_data = [
            # Check unsupported media type
            {'type': 'add', 'item': 'settings', 'data': dict()},
        ]
        self.get_result(
            "post", "/api/v1/_bulk/", 415, data=json.dumps(bulk_request_data)
        )
        # Test linked bulks
        self.get_model_filter(
            'django.contrib.auth.models.User'
        ).exclude(pk=self.user.id).delete()
        bulk_request_data = [
            # Check 201 and username
            {'type': 'add', 'item': 'user', 'data': test_user},
            # Get details from link
            {'type': 'get', 'item': 'user', 'pk': "<0[data][id]>"},
            {'type': 'get', 'item': 'user', 'filters': 'id=<1[data][id]>'}
        ]
        result = self.get_result(
            "post", "/api/v1/_bulk/", 200, data=json.dumps(bulk_request_data)
        )
        self.assertEqual(result[0]['status'], 201)
        self.assertEqual(result[0]['data']['username'], test_user['username'])
        self.assertEqual(result[1]['status'], 200)
        self.assertEqual(result[1]['data']['username'], test_user['username'])


class CoreApiTestCase(BaseTestCase):

    def test_coreapi(self):
        client = CoreAPIClient()
        client.session.auth = HTTPBasicAuth(
            self.user.data['username'], self.user.data['password']
        )
        client.session.headers.update({'x-test': 'true'})
        schema = client.get('http://testserver/api/v1/schema/')
        result = client.action(schema, ['user', 'list'])
        self.assertEqual(result['count'], 1)
        create_data = dict(username='test', password='123', password2='123')
        result = client.action(schema, ['user', 'add'], create_data)
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
            self.get_bulk('hosts', dict(name='a'), 'add'),
            self.get_mod_bulk('hosts', '<0[data][id]>', dict(name='b'), 'subgroups'),
            self.get_mod_bulk('hosts', '<1[data][id]>', dict(name='c'), 'subgroups'),
            self.get_mod_bulk('hosts', '<2[data][id]>', dict(name='d'), 'subgroups'),
            self.get_mod_bulk('hosts', '<0[data][id]>', dict(name='aa'), 'hosts'),
            self.get_mod_bulk('hosts', '<1[data][id]>', dict(name='ba'), 'hosts'),
            self.get_mod_bulk('hosts', '<2[data][id]>', dict(name='ca'), 'hosts'),
            self.get_mod_bulk('hosts', '<3[data][id]>', dict(name='da'), 'hosts'),
        ]

    def test_deep_host_create(self):
        bulk_data = [
            self.get_bulk('deephosts', dict(name='level1'), 'add'),
            self.get_mod_bulk(
                'deephosts', '<0[data][id]>', dict(name='level2'), 'subsubhosts'
            ),
            self.get_mod_bulk(
                'deephosts', '<0[data][id]>', dict(name='level3'),
                'subsubhosts/<1[data][id]>/subdeephosts'
            ),
            self.get_mod_bulk(
                'deephosts', '<0[data][id]>', dict(name='level4'),
                'subsubhosts/<1[data][id]>/subdeephosts/<2[data][id]>/shost'
            ),
            self.get_mod_bulk(
                'deephosts', '<0[data][id]>', {},
                'subsubhosts/<1[data][id]>/subdeephosts/<2[data][id]>/hosts/<3[data][id]>',
                method='get'
            ),
            self.get_mod_bulk(
                'deephosts', '<0[data][id]>', {},
                'subsubhosts/<1[data][id]>/subdeephosts/<2[data][id]>/hosts',
                method='get'
            ),
        ]
        results = self.make_bulk(bulk_data, 'put')
        for result in results[:-2]:
            self.assertEqual(result['status'], 201)
        self.assertEqual(results[-2]['status'], 200)
        self.assertEqual(results[-2]['data']['name'], 'level4')
        self.assertEqual(results[-1]['status'], 200)
        self.assertEqual(results[-1]['data']['count'], 1)

    def test_models(self):
        self.assertEqual(Host.objects.all().count(), self.predefined_hosts_cnt)
        Host.objects.all().delete()
        Host.objects.create(name='test_one')
        self.assertEqual(Host.objects.test_filter().count(), 1)
        Host.objects.create(name=self.random_name(), hidden=True)
        self.assertEqual(Host.objects.all().count(), 2)
        self.assertEqual(Host.objects.all().cleared().count(), 1)

    def _check_subhost(self, id, *args, **kwargs):
        suburls = '/'.join(['{}/{}'.format(s, i) for s, i in args])
        url = self.get_url('hosts', id, suburls)
        result = self.get_result('get', url)
        for key, value in kwargs.items():
            self.assertEqual(result.get(key, None), value, result)

    def test_objects_copy(self):
        Host.objects.all().delete()
        HostGroup.objects.all().delete()
        bulk_data = list(self.objects_bulk_data)
        bulk_data.append(
            self.get_mod_bulk('hosts', '<1[data][id]>', {'name': 'copied'}, 'copy')
        )
        bulk_data.append(
            self.get_mod_bulk('hosts', '<1[data][id]>', {}, 'copy')
        )
        results = self.make_bulk(bulk_data)
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
            self.get_bulk('hosts', dict(name='main'), 'add'),
        ]
        bulk_data += [
            self.get_bulk('subhosts', dict(name='slave-{}'.format(i)), 'add')
            for i in range(size)
        ]
        bulk_data += [
            self.get_mod_bulk('hosts', '<0[data][id]>', [
                '<{}[data]>'.format(i+1) for i in range(size)
            ], 'shost'),
            self.get_mod_bulk('hosts', '<0[data][id]>', {}, 'shost', method='get'),
        ]
        results = self.make_bulk(bulk_data)
        self.assertEqual(results[-1]['data']['count'], size)

    def test_hierarchy(self):
        Host.objects.all().delete()
        HostGroup.objects.all().delete()
        bulk_data = list(self.objects_bulk_data)
        results = self.make_bulk(bulk_data)
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
            self.get_mod_bulk('hosts', host_group_id, {}, 'subgroups', 'get'),
            self.get_mod_bulk('hosts', host_group_id, {}, 'hosts', 'get'),
            self.get_mod_bulk(
                'hosts', host_group_id, dict(name="test1"),
                'hosts/{}'.format(host_id), 'patch'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'hosts/{}'.format(host_id), 'get'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, dict(name="test2"),
                'hosts/{}'.format(host_id), 'put'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'hosts/{}'.format(host_id), 'get'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'hosts/{}'.format(999), 'get'
            ),
            self.get_mod_bulk('hosts', host_group_id, {}, 'subhosts', 'get'),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'hosts/{}'.format(host_id), 'delete'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {'name': ''}, 'hosts/{}'.format(host_id), 'patch'
            ),
            self.get_mod_bulk('hosts', host_group_id, {'name': 'some'}, 'shost'),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'shost/<10[data][id]>', 'delete'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'hosts', 'get', filters='offset=10'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'shost/<24[data][id]>', 'get'
            ),
            self.get_mod_bulk('hosts', host_group_id, {'name': 'some_other'}, 'shost'),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'shost/<14[data][id]>/test', 'get'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'shost/<14[data][id]>/test2', 'get'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'shost/<14[data][id]>/test3', 'get'
            ),
            self.get_mod_bulk('hosts', host_group_id, {}, 'shost/<14[data][id]>', 'delete'),
            self.get_mod_bulk('hosts', host_group_id, dict(id='<14[data][id]>'), 'shost'),
        ]
        results = self.make_bulk(bulk_data, 'put')
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
        self.assertEqual(results[13]['status'], 400)
        self.assertEqual(results[13]['data']['error_type'], "IndexError")
        self.assertEqual(results[15]['status'], 200)
        self.assertEqual(results[15]['data']['detail'], "OK")
        self.assertEqual(results[16]['status'], 201)
        self.assertEqual(results[16]['data']['detail'], "OK")
        self.assertEqual(results[17]['status'], 404)
        self.assertEqual(results[18]['status'], 204)
        self.assertEqual(results[19]['status'], 201)

    def test_coreapi_schema(self):
        stdout = six.StringIO()
        call_command(
            'generate_swagger', '--url', 'http://localhost:8080/',
            format='json', stdout=stdout
        )
        data = json.loads(stdout.getvalue())
        # Check default settings
        self.assertEqual(
            data['basePath'], '/{}/{}'.format(
                self._settings('VST_API_URL'), self._settings('VST_API_VERSION')
            )
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

    def test_manifest_json(self):
        result = self.get_result('get', '/manifest.json')
        self.assertEqual(result['name'], 'Example project')
        self.assertEqual(result['short_name'], 'Test_proj')
        self.assertEqual(result['display'], 'fullscreen')

    def test_model_fk_field(self):
        bulk_data = [
            dict(data_type=['subhosts'], method='post', data={'name': 'tt_name'}),
            dict(data_type=['testfk'], method='post', data={'some_fk': '<0[data][id]>'}),
        ]
        results = self.make_bulk(bulk_data, 'put')
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[1]['data']['some_fk'], results[0]['data']['id'])

    def test_model_namedbinfile_field(self):
        value = {'name': 'abc.png', 'content': '/4sdfsdf/'}
        bulk_data = [
            dict(data_type=['testbinaryfiles'], method='post', data={}),
            dict(data_type=['testbinaryfiles', '<0[data][id]>'], method='get'),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='put',
                data=dict(some_namedbinfile=value, some_namedbinimage=value, some_binfile=value['content'])
            ),
            dict(data_type=['testbinaryfiles', '<0[data][id]>'], method='get'),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_namedbinfile={'name': 'qwe', 'content1': 123})
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_namedbinfile={'name': 'qwe'})
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_namedbinfile=123)
            ),
            # Tests for 'multiplenamedbinfile' field
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='get',
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinfile=123)
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinfile={})
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinfile=[])
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='get',
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinfile=[123])
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinfile=[value])
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='get',
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinfile=[value, 123])
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinfile=[value, {"name1": "invalid", "content": "123"}])
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinfile=[value, value])
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='get',
            ),
            # Tests for 'multiplenamedbinimage' field
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='get',
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinimage=123)
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinimage={})
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinimage=[])
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='get',
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinimage=[123])
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinimage=[value])
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='get',
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinimage=[value, 123])
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinimage=[value, {"name1": "invalid", "content": "123"}])
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='patch',
                data=dict(some_multiplenamedbinimage=[value, value])
            ),
            dict(
                data_type=['testbinaryfiles', '<0[data][id]>'],
                method='get',
            ),
        ]
        results = self.make_bulk(bulk_data, 'put')
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
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
        results = self.make_bulk([
            dict(data_type=['files'], method='get'),
            dict(data_type=['files', 1], method='get'),
            dict(data_type=['files'], method='get', filters='name=ToFilter'),
        ], 'put')

        for result in results:
            self.assertEqual(result['status'], 200, result)

        self.assertEqual(results[0]['data']['count'], 10)
        self.assertEqual(results[1]['data']['origin_pos'], 1, results[1]['data'])
        self.assertEqual(results[2]['data']['count'], 5)

    def test_additional_urls(self):
        response = self.client.get('/suburls/admin/login/')
        self.assertEqual(response.status_code, 200)
        response = self.client.get('/suburls/login/')
        self.assertEqual(response.status_code, 200)


class ToolsTestCase(BaseTestCase):
    def test_get_file_value(self):
        file_name = os.path.join(os.path.dirname(__file__), 'settings.ini')
        with open(file_name, 'r') as fd:
            test_data = fd.read()
        self.assertEqual(get_file_value(file_name, strip=False), test_data)
        self.assertEqual(get_file_value(file_name), test_data[:-1])

        with utils.tmp_file_context(test_data) as tmp_fd:
            fd = ToolsFile(tmp_fd.name.encode('utf-8'))
            self.assertEqual(fd.read(), test_data.encode('utf-8'))
            self.assertEqual(len(fd), len(test_data))
            del fd

        with utils.tmp_file_context(test_data, mode='w+') as tmp_fd:
            fd = ToolsFile(tmp_fd.name.encode('utf-8'), b'wb')
            test_data_text = 'some text data\n'*10
            fd.write(test_data_text.encode('utf-8'))
            fd.flush()
            with open(tmp_fd.name, 'rb') as fd1:
                self.assertEqual(fd1.read().decode('utf-8'), test_data_text)
            del fd

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
        self.maxDiff = 2048

    def tearDown(self) -> None:
        super().tearDown()
        self.maxDiff = self._maxDiff

    def test_file_reader(self):

        class TestFirstSection(Section):
            types_map = {
                'key3': BoolType(), 'sec': IntSecondsType(), 'lst': ListType(), 'emptylst': ListType(),
                'lstdot': ListType(separator='.'), 'tostr': StrType()
            }
            type_key2 = IntType()
            type_jsonkey = JsonType()
            type_keyint1 = IntType()
            type_keyint2 = IntType()
            type_keyint3 = IntType()

        class TestSecondSection(Section):
            pass

        class TestThirdSection(Section):
            pass

        class TestSectionFunctional(Section):
            pass

        class TestKeyHandler(Section):
            def key_handler_to_all(self, key):
                return super().key_handler_to_all(key).upper()

        class TestDefaultSettings(Section):
            type_default2 = IntType()


        class TestConfigParserC(ConfigParserC):
            section_class_another = TestSecondSection
            section_overload = {
                'another.sub': TestThirdSection,
                'another.keyhandler': TestKeyHandler,
                'add_item.subs': TestFirstSection,
            }
            defaults = {
                'withdefault': {
                    'default1': 'default_value1',
                    'default2': '159',
                    'default3': True,
                    'default4': 1209600,
                    'default5': ('one', 'two', 'three'),
                    'defaultsub': {
                        'default_subs_key': 'default_subs_value'
                    }
                }
            }


        format_kwargs = dict(
            INTEGER=22, STRING='kwargs_str'
        )
        test_parser = TestConfigParserC(section_overload=dict(main=TestFirstSection, add_item=TestSectionFunctional, withdefault=TestDefaultSettings), format_kwargs=format_kwargs)
        files_list = ['test_conf.ini', 'test_conf2.ini']
        files_list = map(lambda x: os.path.join(os.path.dirname(__file__), x), files_list)
        config_text = '[another]\nanother_key1 = some_new_value'

        self.assertEqual(list(test_parser.keys()), ['withdefault'])

        config_data = {
            'main': {
                'key1': 'value4',
                'key2': 251,
                'key3': True,
                'keyint1': 2000,
                'keyint2': 2000000,
                'keyint3': 2000000000,
                'sec': 1209600,
                'lst': ('test', '2', '5', 'str'),
                'lstdot': ('test', '2', '5', 'str'),
                'emptylst': (),
                'key22': '/tmp/kwargs_str',
                'jsonkey': [{"jkey": "jvalue"}],
                'formatstr': 'value4',
                'formatint': '251'
            },
            'to_json': {
                "jkey": "jvalue"
            },
            'another': {
                'another_key1': 'some_new_value',
                'another_key2': 'another_value2',
                'another_key3': 'another_value3',
                'keyhandler': {
                    'handler': 'work'
                },
                'sub': {
                    'another_key1': 'another_value2',
                    'another_key2': 'another_value2'
                }
            },
            'withdefault': {
                'default1': 'default_value1',
                'default2': 159,
                'default3': True,
                'default4': 1209600,
                'default5': ('one', 'two', 'three'),
                'defaultsub': {
                    'default_subs_key': 'default_subs_value'
                }
            },
            'gettype': {
                'toint': '257',
                'tobool': 'False',
                'tolist': 'first,second,third',
                'tointsec': '2w',
                'tojson': '{"jsonkey": "jsonvalue"}'
            }
        }

        # Parse files and text
        test_parser.parse_files(files_list)
        test_parser.parse_text(config_text)

        # Check is filled config
        self.assertTrue(test_parser)

        # Compare sections classes, with setuped
        self.assertTrue(isinstance(test_parser['main'], TestFirstSection), type(test_parser['main']))
        self.assertTrue(isinstance(test_parser['another']['keyhandler'], TestKeyHandler))
        self.assertTrue(isinstance(test_parser['another'], TestSecondSection))
        self.assertTrue(isinstance(test_parser['another']['sub'], TestThirdSection))

        # Compare data
        self.assertDictEqual(test_parser, config_data)

        # Test method `all()` for config and compare with data
        self.assertDictEqual(test_parser['main'].all(), config_data['main'])

        # Check types for vars, that was setup
        self.assertTrue(isinstance(test_parser['main']['key2'], int))
        self.assertTrue(isinstance(test_parser['main']['key3'], bool))
        self.assertTrue(isinstance(test_parser['main']['sec'], int))
        self.assertTrue(isinstance(test_parser['main']['lst'], tuple))
        self.assertTrue(isinstance(test_parser['main']['emptylst'], tuple))

        # Check __setitem__ and __getitem__ for config
        test_parser['add_item'] = dict()
        test_parser['add_item']['subs'] = dict()
        self.assertTrue(isinstance(test_parser['add_item'], TestSectionFunctional))
        self.assertTrue(isinstance(test_parser['add_item']['subs'], TestFirstSection))
        self.assertDictEqual(test_parser['add_item'], {'subs': {}})


        # Make manual typeconversation, and two times conversation same value
        self.assertEqual(test_parser['main'].getint('key2'), 251)
        self.assertEqual(test_parser['gettype'].getint('toint'), 257)
        self.assertTrue(isinstance(test_parser['gettype'].getint('toint'), int))

        self.assertEqual(test_parser['main'].getboolean('key3'), True)
        self.assertEqual(test_parser['gettype'].getboolean('tobool'), False)
        self.assertTrue(isinstance(test_parser['gettype'].getboolean('tobool'), bool))

        self.assertEqual(test_parser['main'].getseconds('sec'), 1209600)
        self.assertEqual(test_parser['gettype'].getseconds('tointsec'), 1209600)
        self.assertTrue(isinstance(test_parser['gettype'].getseconds('tointsec'), int))

        self.assertEqual(test_parser['gettype'].getlist('tolist'), ('first', 'second', 'third'))
        self.assertTrue(isinstance(test_parser['gettype'].getlist('tolist'), tuple))
        self.assertEqual(test_parser['main'].getlist('lstdot', '.'), ('test', '2', '5', 'str'))
        self.assertEqual(test_parser['main'].getlist('key1', '.'), ('value4',))
        self.assertEqual(test_parser['main'].getlist('key2', '.'), (251,))

        self.assertDictEqual(test_parser['gettype'].getjson('tojson'), {'jsonkey': 'jsonvalue'})
        self.assertEqual(test_parser['main'].getjson('key2'), 251)
        self.assertDictEqual(test_parser['another'].getjson('keyhandler'), {'handler': 'work'})

        test_parser['add_item']['subs']['tostr'] = 25
        self.assertEqual(test_parser['add_item']['subs']['tostr'], '25')

        # Test `get()` method of config
        self.assertEqual(test_parser.get('main').get('key1'), 'value4')

        # Check file exist handler
        test_parser.parse_file('123.txt')

        # Check parser exception handler
        with self.assertRaises(ConfigParserException):
            test_parser.parse_text('qwerty')

        # CHECK SETTINGS FROM CONFIG FILE
        db_default_val = {
            'OPTIONS': {'timeout': 20},
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
            'hostname': '{}@%h'.format(pwd.getpwuid(os.getuid()).pw_name),
            'beat': True
        }
        self.assertDictEqual(worker_options, settings.WORKER_OPTIONS)
