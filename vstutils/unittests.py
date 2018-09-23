# pylint: disable=import-error,invalid-name,no-member,function-redefined,unused-import
import os
import shutil
import six
try:
    from mock import patch
except ImportError:  # nocv
    from unittest.mock import patch
from fakeldap import MockLDAP
from django.test import Client
from django.core.management import call_command
from requests.auth import HTTPBasicAuth
from rest_framework.test import CoreAPIClient
from vstutils.tests import BaseTestCase, json, settings, override_settings
from vstutils.urls import router
from vstutils.api.views import UserViewSet
from vstutils import utils
from vstutils.exceptions import UnknownTypeException
from vstutils.ldap_utils import LDAP

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


class VSTUtilsTestCase(BaseTestCase):
    def setUp(self):
        super(VSTUtilsTestCase, self).setUp()

    def _get_test_ldap(self, client, data):
        self.client.post('/login/', data=data)
        response = client.get('/api/v1/users/')
        self.assertNotEqual(response.status_code, 200)
        response = self.client.post("/logout/")
        self.assertEqual(response.status_code, 302)

    @patch('vstutils.ldap_utils.ldap.initialize')
    def test_ldap_auth(self, ldap_obj):
        User = self.get_model_class('django.contrib.auth.models.User')
        User.objects.create(username='admin')
        # Test on fakeldap
        admin = "admin@test.lan"
        admin_password = "ldaptest"
        LDAP_obj = MockLDAP({
            admin: {"userPassword": [admin_password], 'cn': [admin]},
            'test': {"userPassword": [admin_password]}
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
        ldap_obj.reset_mock()
        admin_dict = {
            "objectCategory": ['top', 'user'],
            "userPassword": [admin_password],
            'cn': [admin]
        }
        tree = {
            admin: admin_dict,
            "dc=test,dc=lan": {
                'cn=admin,dc=test,dc=lan': admin_dict,
                'cn=test,dc=test,dc=lan': {"objectCategory": ['person', 'user']},
            }
        }
        LDAP_obj = MockLDAP(tree)
        ldap_obj.return_value = LDAP_obj
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
        @utils.model_lock_decorator()
        def method(pk):
            # pylint: disable=unused-argument
            pass

        @utils.model_lock_decorator()
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

    def test_main_views(self):
        # Main
        self.get_result('get', '/')
        self.get_result('post', '/logout/', 302)
        self.get_result('post', '/login/', 200)
        self.get_result('get', '/login/', 302)
        # API
        keys = list(self.get_result('get', '/api/').keys())
        for key in ['openapi', 'v1']:
            self.assertIn(key, keys)
        self.assertEqual(
            list(self.get_result('get', '/api/v1/').keys()).sort(),
            list(settings.API[settings.VST_API_VERSION].keys()).sort()
        )
        # 404
        self.get_result('get', '/api/v1/some/', code=404)
        self.get_result('get', '/other_invalid_url/', code=404)
        self.get_result('get', '/api/users/', code=404)
        self.get_result('get', '/api/v1/users/1000/', code=404)

    def test_uregister(self):
        router_v1 = router.routers[0][1]
        router_v1.unregister("users")
        for pattern in router_v1.get_urls():
            self.assertIsNone(pattern.regex.search("users/1/"))
        router_v1.register('users', UserViewSet)
        checked = False
        for pattern in router_v1.registry:
            if pattern[0] == 'users':
                checked = True
                self.assertEqual(pattern[1], UserViewSet)
        self.assertTrue(checked, "Not registered!")

    def test_settings_api(self):
        result = self.get_result('get', '/api/v1/settings/')
        self.assertIn('system', result)
        self.assertIn('localization', result)
        self.details_test(
            '/api/v1/settings/localization/',
            LANGUAGE_CODE=settings.LANGUAGE_CODE,
            TIME_ZONE=settings.TIME_ZONE
        )
        self.details_test('/api/v1/settings/system/', PY=settings.PY_VER)

    def test_users_api(self):
        self.list_test('/api/v1/users/', 1)
        self.details_test(
            '/api/v1/users/{}/'.format(self.user.id),
            username=self.user.username, id=self.user.id
        )
        self.get_result('delete', '/api/v1/users/{}/'.format(self.user.id), 409)

        user_data = dict(
            username="test_user", first_name="some", last_name='test', email="1@test.ru"
        )
        post_data = dict(password="some_password", **user_data)
        result = self.get_result('post', '/api/v1/users/', data=post_data)
        self.assertCheckDict(user_data, result)
        result = self.get_result('get', '/api/v1/users/{}/'.format(result['id']))
        self.assertCheckDict(user_data, result)
        self.get_result('patch', '/api/v1/users/', 405, data=dict(email=""))
        result = self.get_result('get', '/api/v1/users/{}/'.format(result['id']))
        self.assertCheckDict(user_data, result)
        user_data['first_name'] = 'new'
        post_data_dict = dict(partial=True, **user_data)
        self._check_update(
            '/api/v1/users/{}/'.format(result['id']), post_data_dict,
            method='put', **user_data
        )
        del post_data_dict['partial']
        post_data_dict['email'] = "skldjfnlkjsdhfljks"
        post_data_dict['password'] = "skldjfnlkjsdhfljks"
        post_data = json.dumps(post_data_dict)
        self.get_result(
            'patch', '/api/v1/users/{}/'.format(result['id']), data=post_data, code=400
        )
        self.get_result('delete', '/api/v1/users/{}/'.format(result['id']))
        user_data['email'] = 'invalid_email'
        post_data = dict(password="some_password", **user_data)
        self.post_result('/api/v1/users/', data=post_data, code=400)
        self.post_result('/api/v1/users/', data=user_data, code=400)
        self.post_result(
            '/api/v1/users/', data=dict(username=self.user.username), code=409
        )
        self.assertCount(self.get_model_filter('django.contrib.auth.models.User'), 1)
        url_to_user = '/api/v1/users/{}/'.format(self.user.id)
        self.change_identity(False)
        self.get_result('get', url_to_user, 403)
        user_data['email'] = 'test@test.lan'
        self.post_result('/api/v1/users/', data=user_data, code=403)
        self.assertEqual(self.get_count('django.contrib.auth.models.User'), 2)
        update_password = json.dumps(dict(password='12345'))
        self.get_result(
            'patch', '/api/v1/users/{}/'.format(self.user.id), data=update_password
        )
        self.change_identity(True)
        data = [
            dict(username="USER{}".format(i), password="123") for i in range(10)
        ]
        users_id = self.mass_create('/api/v1/users/', data, 'username')
        self.assertEqual(self.get_count('django.contrib.auth.models.User'), 13)
        comma_id_list = ",".join([str(i) for i in users_id])
        result = self.get_result('get', '/api/v1/users/?id={}'.format(comma_id_list))
        self.assertCount(users_id, result['count'])
        result = self.get_result('get', '/api/v1/users/?username=USER')
        self.assertCount(users_id, result['count'])
        result = self.get_result('get', '/api/v1/users/?username__not=USER')
        self.assertEqual(result['count'], 3)

    def test_bulk(self):
        self.get_model_filter(
            'django.contrib.auth.models.User'
        ).exclude(pk=self.user.id).delete()
        self.details_test(
            '/api/v1/_bulk/', operations_types=list(settings.BULK_OPERATION_TYPES.keys())
        )
        data = [
            dict(username="USER{}".format(i), password="123") for i in range(10)
        ]
        users_id = self.mass_create('/api/v1/users/', data, 'username')
        test_user = dict(username=self.random_name(), password='123')
        userself_data = dict(first_name='me')
        bulk_request_data = [
            # Check code 204
            {'type': 'del', 'item': 'users', 'pk': users_id[0]},
            # Check code 404
            {'type': 'del', 'item': 'users', 'pk': 0},
            # Check 201 and username
            {'type': 'add', 'item': 'users', 'data': test_user},
            # Check update first_name by self
            {'type': 'set', 'item': 'users', 'pk': self.user.id, 'data': userself_data},
            # Check mods to view detail
            {'type': 'mod', 'item': 'settings', "method": "get",
             'data_type': ["system"]},
            # Check bulk-filters
            {'type': 'get', 'item': 'users',
             'filters': 'id={}'.format(','.join([str(i) for i in users_id]))
            },
            # Check `__init__` mod as default
            {"method": "get", 'data_type': ["settings", "system"]},
            {"method": "get", 'data_type': ["users", self.user.id]},
            {"method": "get", 'data_type': ["users"]},
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
        self.assertEqual(result[4]['data']['PY'], settings.PY_VER)
        self.assertEqual(result[5]['status'], 200)
        self.assertEqual(result[5]['data']['count'], len(users_id)-1)
        self.assertEqual(result[6]['status'], 200)
        self.assertEqual(result[6]['data']['PY'], settings.PY_VER)
        self.assertEqual(result[7]['status'], 200)
        self.assertEqual(result[7]['data']['id'], self.user.id)
        self.assertEqual(result[8]['status'], 200)

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
            {'type': 'add', 'item': 'users', 'data': test_user},
            # Get details from link
            {'type': 'get', 'item': 'users', 'pk': "<0[data][id]>"},
            {'type': 'get', 'item': 'users', 'filters': 'id=<1[data][id]>'}
        ]
        result = self.get_result(
            "post", "/api/v1/_bulk/", 200, data=json.dumps(bulk_request_data)
        )
        self.assertEqual(result[0]['status'], 201)
        self.assertEqual(result[0]['data']['username'], test_user['username'])
        self.assertEqual(result[1]['status'], 200)
        self.assertEqual(result[1]['data']['username'], test_user['username'])

    def test_coreapi(self):
        client = CoreAPIClient()
        client.session.auth = HTTPBasicAuth(
            self.user.data['username'], self.user.data['password']
        )
        client.session.headers.update({'x-test': 'true'})
        schema = client.get('http://testserver/api/v1/schema/')
        result = client.action(schema, ['users', 'list'])
        self.assertEqual(result['count'], 1)
        create_data = dict(username='test', password='123')
        result = client.action(schema, ['users', 'add'], create_data)
        self.assertEqual(result['username'], create_data['username'])
        self.assertFalse(result['is_staff'])
        self.assertTrue(result['is_active'])
