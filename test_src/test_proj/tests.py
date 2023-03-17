# pylint: disable=import-error,invalid-name,no-member,function-redefined,unused-import

import gzip
import os
import pathlib
import sys
import shutil
import re
import io
import pwd
import base64
import datetime
from copy import deepcopy
from pathlib import Path
from smtplib import SMTPException

from unittest.mock import patch, PropertyMock

from collections import OrderedDict

import ormsgpack
import pytz
from bs4 import BeautifulSoup
from django import VERSION as django_version
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.core import mail
from django.db.models import F
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.template.exceptions import TemplateDoesNotExist
try:
    from django.middleware.csrf import _get_new_csrf_token
except ImportError:  # nocv
    from django.middleware.csrf import _get_new_csrf_string as _get_new_csrf_token
from django.core.cache import cache
from django.contrib.auth.hashers import make_password
from django.contrib.auth import get_user_model
from django.test import Client
from django.http import FileResponse, HttpResponseNotModified
from django.test.client import RequestFactory
from django.urls import reverse
from fakeldap import MockLDAP

from vstutils import utils
from vstutils.asgi import application
from vstutils.api.models import Language
from vstutils.api.schema.inspectors import X_OPTIONS
from vstutils.api.serializers import BaseSerializer
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
from vstutils.models import notify_clients, bulk_notify_clients
from vstutils.models.fields import MultipleFieldFile
from vstutils.templatetags.vst_gravatar import get_user_gravatar
from vstutils.tests import BaseTestCase, json, override_settings
from vstutils.tools import get_file_value
from vstutils.urls import router
from vstutils.api import serializers, fields
from vstutils.utils import SecurePickling, BaseEnum, get_render
from vstutils.api.validators import resize_image

from .models import (
    File,
    Host,
    HostGroup,
    List,
    ListOfFiles,
    Author,
    Post,
    OverridenModelWithBinaryFiles,
    ModelWithBinaryFiles,
    ModelForCheckFileAndImageField,
    ModelWithNestedModels,
    ProtectedBySignal,
)
from rest_framework.exceptions import ValidationError
from base64 import b64encode
from PIL import Image
from io import BytesIO
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
        "build": "APP_ENV=prod webpack --json test_project/static/test_project/bundle/output.json",
        "devBuild": "webpack --json test_project/static/test_project/bundle/output.json",
        "lint": "eslint --ext .js,.vue frontend_src/"
    },
    "dependencies": {},
    "devDependencies": {
        "@babel/core": "^7.16.7",
        "@babel/eslint-parser": "^7.16.5",
        "@babel/plugin-transform-runtime": "^7.16.8",
        "@babel/preset-env": "^7.16.8",
        "babel-loader": "^8.2.3",
        "css-loader": "^6.5.1",
        "dotenv": "^11.0.0",
        "eslint": "^8.6.0",
        "eslint-config-prettier": "^8.3.0",
        "eslint-plugin-prettier": "^4.0.0",
        "eslint-plugin-vue": "^8.2.0",
        "prettier": "^2.5.1",
        "sass": "^1.48.0",
        "sass-loader": "^12.4.0",
        "style-loader": "^3.3.1",
        "vue-loader": "^15.9.8",
        "vue-template-compiler": "^2.6.14",
        "webpack": "^5.66.0",
        "webpack-bundle-analyzer": "^4.5.0",
        "webpack-cli": "^4.9.1"
    }
}

validator_dict = {
    'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
}


def to_soup(content):
    return BeautifulSoup(content, 'html.parser')


class VSTUtilsCommandsTestCase(BaseTestCase):
    maxDiff = None

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

    def test_runserver(self):
        with self.patch('uvicorn.run') as mock_urun:
            mock_urun.side_effect = lambda *args, **kwargs: 'OK'

            self.assertEqual(mock_urun.call_count, 0)
            call_command('runserver')
            self.assertEqual(mock_urun.call_count, 1)
            mock_urun.assert_called_with(
                app='vstutils.asgi:application',
                access_log=True,
                interface='asgi3',
                log_level=settings.LOG_LEVEL.lower(),
                host='127.0.0.1',
                port=8080,
                reload=True,
                workers=1,
                reload_dirs=sorted([settings.VST_PROJECT_DIR, settings.VSTUTILS_DIR]),
            )

            call_command('runserver', addrport='0.0.0.0:80')
            self.assertEqual(mock_urun.call_count, 2)
            mock_urun.assert_called_with(
                app='vstutils.asgi:application',
                access_log=True,
                interface='asgi3',
                log_level=settings.LOG_LEVEL.lower(),
                host='0.0.0.0',
                port=80,
                reload=True,
                workers=1,
                reload_dirs=sorted([settings.VST_PROJECT_DIR, settings.VSTUTILS_DIR]),
            )

    def test_dockerrun(self):
        with self.patch('subprocess.check_call') as mock_obj:
            mock_obj.side_effect = lambda *args, **kwargs: 'OK'
            call_command('dockerrun', attempts=4, attempts_timeout=0.01)
            self.assertEqual(mock_obj.call_count, 3)
            self.assertEqual(
                mock_obj.call_args[0][0],
                [sys.executable, '-m', 'test_proj', 'web']
            )
            mock_obj.reset_mock()

            def check_call_error(*args, **kwargs):
                raise Exception('Test exception.')

            mock_obj.side_effect = check_call_error
            with self.assertRaises(SystemExit):
                call_command('dockermigrate', attempts=1, attempts_timeout=0.0001)
            with self.assertRaises(SystemExit):
                call_command('dockerrun', attempts=1, attempts_timeout=0.0001)

        with self.patch('subprocess.check_call', return_value=0) as mock_obj:
            with self.assertRaises(SystemExit) as cm:
                call_command('celery_inspect', 'ping', json=True)
            self.assertEqual(cm.exception.code, 0)
            self.assertEqual(mock_obj.call_count, 1)
            self.assertEqual(
                mock_obj.call_args[0][0].strip(),
                f'{sys.executable} -m celery --app=test_proj.wapp:app inspect ping --json',
            )

        with self.patch('subprocess.check_call', return_value=0) as mock_obj:
            with self.assertRaises(SystemExit) as cm:
                call_command('runrpc', migrate=False)
            self.assertEqual(cm.exception.code, 0)
            self.assertEqual(mock_obj.call_count, 1)
            self.assertTrue(
                mock_obj.call_args[0][0].strip().startswith(
                    f'{sys.executable} -m celery --app=test_proj.wapp:app worker'
                ),
            )


class VSTUtilsTestCase(BaseTestCase):
    use_msgpack = True

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

    def test_deep_nested_qs(self):
        # foreign key
        GroupWithFK = self.get_model_class('test_proj.GroupWithFK')
        Group = self.get_model_class('test_proj.Group')
        groups_structure = [
            ['1', None],
            ['1.1', 0],
            ['1.1.1', 1],
            ['1.1.1.1', 2],
            ['1.1.1.1.1', 3],
            ['1.2', 0],
            ['1.2.1', 5],
        ]
        fk_structure = deepcopy(groups_structure)
        m2m_structure = deepcopy(groups_structure)
        for i in range(len(groups_structure)):
            parent_key = groups_structure[i][1]
            fk_parent = None
            m2m_parent = None
            if parent_key is not None:
                fk_parent = fk_structure[parent_key]
                m2m_parent = m2m_structure[parent_key]
            name = groups_structure[i][0]
            fk_structure[i] = GroupWithFK.objects.create(name=name, parent=fk_parent)

            group = Group.objects.create(name=name)
            m2m_structure[i] = group
            if m2m_parent:
                group.parents.add(m2m_parent)

        def get_deep_nested_result():
            # fk
            fk_first_qs = GroupWithFK.objects.filter(id=fk_structure[0].id)
            fk_last_qs = GroupWithFK.objects.filter(id=fk_structure[-1].id)
            get_fk_nested = [
                # parents for one group
                fk_last_qs.get_parents(),
                # parents for one group with current qs(with child)
                fk_last_qs.get_parents(with_current=True),
                # parents for one group
                fk_first_qs.get_children(),
                # parents for one group with current qs(with child)
                fk_first_qs.get_children(with_current=True),
            ]

            # m2m
            m2m_first_qs = Group.objects.filter(id=m2m_structure[0].id)
            m2m_last_qs = Group.objects.filter(id=m2m_structure[-1].id)
            get_m2m_nested = [
                # parents for one group
                m2m_last_qs.get_parents(),
                # parents for one group with current qs(with child)
                m2m_last_qs.get_parents(with_current=True),
                # parents for one group
                m2m_first_qs.get_children(),
                # parents for one group with current qs(with child)
                m2m_first_qs.get_children(with_current=True),
            ]
            return get_fk_nested, get_m2m_nested

        for result in get_deep_nested_result():
            self.assertEqual(
                list(map(lambda x: x.count(), result)),
                [2, 3, 6, 7]
            )

        # use without cte old logic if db doesn't support cte
        with override_settings(DATABASES_WITHOUT_CTE_SUPPORT=['default']):
            for result in get_deep_nested_result():
                self.assertEqual(
                    list(map(lambda x: x.count(), result)),
                    [2, 3, 6, 7]
                )

    def test_patching_field_defaults(self):
        User = self.get_model_class('auth.User')
        date = datetime.datetime(2022, 8, 1).astimezone(pytz.timezone(settings.TIME_ZONE))

        with self.patch_field_default(User, 'date_joined', date):
            user = User.objects.create_superuser(username='test username', email='test@taes.cn', password='qwerty')

        user.delete()
        self.assertEqual(user.date_joined, date)

    def test_deep_nested_with_filters(self):
        GroupWithFK = self.get_model_class('test_proj.GroupWithFK')
        ModelWithNestedModels = self.get_model_class('test_proj.ModelWithNestedModels')

        related1 = ModelWithNestedModels.objects.create(name='related1')
        related1_1 = ModelWithNestedModels.objects.create(name='related1_1')
        related2_2 = ModelWithNestedModels.objects.create(name='related2_2')

        group1 = GroupWithFK.objects.create(name='Group 1', fkmodel=related1)
        group1_1 = GroupWithFK.objects.create(name='Group 1_1', parent=group1, fkmodel=related1_1)
        group1_1_1 = GroupWithFK.objects.create(name='Group 1_1_1', parent=group1_1)

        group2 = GroupWithFK.objects.create(name='Group 2')
        group2_2 = GroupWithFK.objects.create(name='Group 2_2', parent=group2, fkmodel=related2_2)

        related_models = [None, related1_1, related1]
        group_names = ['Group 1_1_1', 'Group 1_1', 'Group 1']

        with self.assertNumQueries(1):
            groups = list(
                GroupWithFK.objects
                    .filter(id=group1_1_1.id)
                    .get_parents(with_current=True)
                    .select_related('fkmodel')
                    .annotate(parent_name=F('parent__name'))
                    .order_by('-id')
            )

            self.assertEqual(len(groups), 3)
            self.assertListEqual(
                [group.name for group in groups],
                group_names,
            )
            self.assertListEqual(
                [group.fkmodel for group in groups],
                related_models
            )
            self.assertListEqual(
                [group.parent_name for group in groups],
                ['Group 1_1', 'Group 1', None],
            )

        with self.assertNumQueries(1):
            groups = list(
                GroupWithFK.objects
                    .filter(id=group1.id)
                    .get_children(with_current=True)
                    .select_related('fkmodel')
                    .order_by('-id')
            )

            self.assertEqual(len(groups), 3)
            self.assertListEqual(
                [group.name for group in groups],
                group_names,
            )
            self.assertListEqual(
                [group.fkmodel for group in groups],
                related_models,
            )


class ViewsTestCase(BaseTestCase):
    use_msgpack = True

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
        self.assertEqual(api['metrics'], 'https://vstutilstestserver/api/metrics')
        self.assertEqual(
            list(self.get_result('get', '/api/v1/').keys()).sort(),
            list(self.settings_obj.API[self.settings_obj.VST_API_VERSION].keys()).sort()
        )

        # Check static views
        self.get_result('get', '/static/bundle/output.json', code=200)
        self.get_result('get', '/docs/', code=200)
        self.get_result('get', '/docs/index.html', code=200)

        # Check static views from fastapi
        fclient = self.api_test_client
        response = fclient.get('/docs/')
        self.assertEqual(response.status_code, 200)

        response = fclient.get('/static/bundle/')
        self.assertEqual(response.status_code, 404)
        response = fclient.get('/static/bundle/output.json')
        self.assertEqual(response.status_code, 200)
        response = fclient.get('/media/test.txt')
        self.assertEqual(response.status_code, 200)

        # 404
        self.get_result('get', '/api/v1/some/', code=404)
        self.get_result('get', '/other_invalid_url/', code=404)
        self.get_result('get', '/api/user/', code=404)
        self.get_result('get', '/api/v1/user/1000/', code=404)
        self.get_result('get', '/static/bundle/output.json_unknown', code=404)

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
        results = self.bulk([
            {'method': 'post', 'path': 'user', 'data': i}
            for i in data
        ])
        users_id = tuple(r['data']['id'] for r in results)
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
        user = dict(
            username='newuser',
            password1='pass',
            password2='pass',
            email='new@user.com',
            agreement=True,
            consent_to_processing=True,
        )
        user_fail = dict(
            username='newuser',
            password1='pass',
            password2='pss',
            email='new@user.com',
            agreement=True,
            consent_to_processing=True,
        )
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
            ['username', 'email', 'password1', 'password2', 'agreement', 'consent_to_processing']
        )

        # Correct registration request
        response = self.call_registration(user)
        self.assertRedirects(response, self.confirmation_redirect_url)

        self.assertCount(mail.outbox, 1)
        regex = r"http(s)?:\/\/.*\/registration\/(\?.*?(?=\")){0,1}"
        match = re.search(regex, mail.outbox[-1].alternatives[-1][0], re.MULTILINE)
        href = match.group(0)

        href_base, correct_uid = href.split('uid=')

        response = client.post(href_base, {'uid': 'wrong'})
        self.assertEqual(response.status_code, 200)
        self.assertDictEqual(response.context_data['form'].errors.get_json_data(), {
            'uid': [{'message': 'Confirmation link is invalid or expired', 'code': ''}],
        })

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

        client.post(href_base, {'uid': correct_uid})
        response = client.post(href_base, {'uid': correct_uid})
        self.assertEqual(len(response.context['form'].errors), 1)
        self.assertEqual(response.context['form'].errors['uid'][0], 'Confirmation link is invalid or expired')

        get_user_model().objects.filter(email=user['email']).delete()
        response = client.post(href, {'uid': user['uid']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.context['form'].errors), 1)
        self.assertEqual(response.context['form'].errors['uid'][0], 'Confirmation link is invalid or expired')

        client.post(self.logout_url)
        client.get(href)
        response = client.post(href, user)
        self.assertEqual(response.status_code, 302)

    def test_registration_with_confirmation(self):
        user = dict(
            first_name='alex',
            last_name='mercer',
            password1='New@password22',
            password2='New@password22',
            email='new@user.com',
            username='trop',
            agreement=True,
            consent_to_processing=True
        )

        client = self.client_class()
        response = self.call_registration(data=user, HTTP_ACCEPT_LANGUAGE='ru-RU')
        self.assertRedirects(response, self.confirmation_redirect_url)
        response = client.get(self.confirmation_redirect_url)
        self.assertIn('Confirm your email before logging in', str(response.content))

        self.assertCount(mail.outbox, 1)
        confirmation_message = str(mail.outbox[-1].message())

        self.assertIn('Подтвердите свой аккаунт', confirmation_message)
        self.assertIn('Пожалуйста, подтвердите свой Example Project аккаунт', confirmation_message)

        regex = r"http(s)?:\/\/.*\/registration\/(\?.*?(?=\")){0,1}"
        match = re.search(regex, confirmation_message, re.MULTILINE)
        href = match.group(0)
        correct_uid = href.split('uid=')[-1]
        response = client.post(self.login_url, data={'username': user['username'], 'password': user['password1']})
        # login failed
        self.assertIn('Please enter a correct username and password', str(response.context_data['form'].errors))
        response = client.get('/')
        self.assertFalse(response.wsgi_request.user.is_authenticated)
        # confirm email (different client)
        client2 = self.client_class()
        response = client2.post(href, {'uid': correct_uid})
        self.assertRedirects(response, self.login_url, target_status_code=302)
        response = client2.post(self.login_url, data={'username': user['username'], 'password': user['password1']})
        # successful login
        response = client2.get('/')
        self.assertTrue(response.wsgi_request.user.is_authenticated)

    def test_terms_agreement(self):
        user = dict(
            username='newuser',
            password1='pass',
            password2='pass',
            email='new@user.com',
            agreement=True,
            consent_to_processing=True,
        )
        user_fail = dict(
            username='newuser',
            password1='pass',
            password2='pass',
            email='new@user.com',
            consent_to_processing=True,
        )
        client = self.client_class()

        lang_text_data = {
            'ru': 'лицензионное соглашение',
            'en': 'terms of agreement',
            'cn': '协议条款',
            'vi': 'các điều khoản của thỏa thuận'
        }
        # Correct registration request returns redirect
        response = self.call_registration(user)
        self.assertRedirects(response, self.confirmation_redirect_url)

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
            self.assertRedirects(response, self.confirmation_redirect_url)

        # Response with 'lang=en' returns default 'terms.md' with correct html
        with utils.tmp_file(data='## test_header', encoding='utf8') as md_file:
            with override_settings(AGREEMENT_TERMS_PATH=md_file.path):
                response = self.client.get(reverse('terms') + f'?lang=en')

                self.assertEqual(response.status_code, 200)
                self.assertTemplateUsed(response, 'registration/base_agreements.html')
                self.assertContains(response, '<h2>test_header</h2>')

        # Response with different languages returns different terms
        for item in lang_text_data.items():
            with utils.tmp_file(data=f'## {item[1]}', encoding='utf8', suffix=f'.{item[0]}') as md_file:
                with override_settings(AGREEMENT_TERMS_PATH=f'/tmp/{Path(md_file.path).stem}'):

                    response_with_en_lang = self.client.get(reverse('terms') + f'?lang={item[0]}')
                    self.assertEqual(response_with_en_lang.status_code, 200)
                    self.assertContains(response_with_en_lang, f'<h2>{item[1]}</h2>')

    def test_personal_data_processing(self):
        user = dict(
            username='newuser',
            password1='pass',
            password2='pass',
            email='new@user.com',
            agreement=True,
            consent_to_processing=True,
        )
        user_fail = dict(
            username='newuser',
            password1='pass',
            password2='pass',
            email='new@user.com',
            agreement=True,
        )
        client = self.client_class()

        lang_text_data = {
            'ru': 'политика обработки персональных данных',
            'en': 'personal data processing policy',
            'cn': '个人资料处理政策',
            'vi': 'chính sách xử lý dữ liệu cá nhân'
        }
        # Correct registration request returns redirect
        response = self.call_registration(user)
        self.assertRedirects(response, self.confirmation_redirect_url)

        # Try registration without consent_to_processing returns error
        response = self.call_registration(user_fail)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.context_data['form'].errors['consent_to_processing'][0],
            'To continue, need to agree to the personal data processing policy.'
        )

        # If ENABLE_CONSENT_TO_PROCESSING=False, registration without `consent_to_processing` returns redirect
        with override_settings(ENABLE_CONSENT_TO_PROCESSING=False):
            response = self.call_registration(user_fail)
            self.assertRedirects(response, self.confirmation_redirect_url)

        # Response with 'lang=en' returns default 'consent_to_processing.md' with correct html
        with utils.tmp_file(data='## test_header', encoding='utf8') as md_file:
            with override_settings(CONSENT_TO_PROCESSING_PATH=md_file.path):
                response = self.client.get(reverse('consent_to_processing') + '?lang=en')

                self.assertEqual(response.status_code, 200)
                self.assertTemplateUsed(response, 'registration/base_agreements.html')
                self.assertContains(response, '<h2>test_header</h2>')

        # Response with different languages returns different personal_data_processing_policy
        for item in lang_text_data.items():
            with utils.tmp_file(data=f'## {item[1]}', encoding='utf8', suffix=f'.{item[0]}') as md_file:
                with override_settings(CONSENT_TO_PROCESSING_PATH=f'/tmp/{Path(md_file.path).stem}'):

                    response_with_different_lang = self.client.get(reverse('consent_to_processing') + f'?lang={item[0]}')
                    self.assertEqual(response_with_different_lang.status_code, 200)
                    self.assertContains(response_with_different_lang, f'<h2>{item[1]}</h2>')

        # If file not found - returns 404 status
        response_without_file = self.client.get(reverse('consent_to_processing'))
        self.assertEqual(response_without_file.status_code, 404)

    @override_settings(SEND_CONFIRMATION_EMAIL=False, AUTHENTICATE_AFTER_REGISTRATION=False)
    def test_register_new_user_without_confirmation(self):
        user = dict(
            username='newuser',
            password1='pass',
            password2='pass',
            email='new@user.com',
            agreement=True,
            consent_to_processing = True,
        )
        user_fail = dict(
            username='newuser',
            password1='pass',
            password2='pss',
            email='new@user.com',
            agreement=True,
            consent_to_processing=True,
        )
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

    def test_non_superuser_cannot_change_is_staff_status(self):
        nonstaff_user = self._create_user(is_super_user=False, is_staff=True)

        # as superuser
        results = self.bulk([
            {'method': 'patch', 'path': ['user', 'profile'], 'data': {'is_staff': False}},
            {'method': 'patch', 'path': ['user', self.user.id], 'data': {'is_staff': False}},
            {'method': 'patch', 'path': ['user', nonstaff_user.id], 'data': {'is_staff': False}},
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[1]['status'], 200)
        self.assertFalse(results[2]['data']['is_staff'])

        nonstaff_user.refresh_from_db()
        with self.user_as(self, nonstaff_user):
            results = self.bulk_transactional([
                {'method': 'patch', 'path': ['user', 'profile'], 'data': {'is_staff': True}},
                {'method': 'patch', 'path': ['user', nonstaff_user.id], 'data': {'is_staff': True}},
            ])
        for result in results:
            self.assertEqual(result['status'], 200)
            self.assertFalse(nonstaff_user.is_staff)


class DefaultBulkTestCase(BaseTestCase):
    use_msgpack = True

    def test_bulk(self):
        self.get_model_filter(
            'django.contrib.auth.models.User'
        ).exclude(pk=self.user.id).delete()
        data = [
            dict(username="USER{}".format(i), password="123", password2='123')
            for i in range(10)
        ]
        results = self.bulk([
            {'method': 'post', 'path': ['user'], 'data': i}
            for i in data
        ])
        users_id = tuple(r['data']['id'] for r in results)
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
    use_msgpack = False
    maxDiff = None

    @override_settings(CENTRIFUGO_CLIENT_KWARGS={
        'address': 'https://localhost:8000',
        'api_key': "XXX",
        'token_hmac_secret_key': "YYY"
    }, CENTRIFUGO_PUBLIC_HOST='https://public:8000/api')
    def test_get_openapi(self):
        api = self.endpoint_schema()

        # Check project title
        self.assertEqual(api['info']['title'], 'Example Project')

        # Check Centrifugo settings
        self.assertEqual(api['info']['x-centrifugo-address'], "wss://public:8000/connection/websocket")
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
        expected = deepcopy(api['definitions']['ModelWithBinaryFiles']['properties'])
        from_api = api['definitions']['OverridenModelWithBinaryFiles']['properties']
        # need to be overrided because has validator on field
        self.assertEqual(
            set(from_api['some_namedbinfile']['x-validators']['extensions']),
            set(['text/plain', 'application/json']),
        )
        expected['some_namedbinfile']['x-validators']['extensions'] = from_api['some_namedbinfile']['x-validators']['extensions']
        expected['some_filefield']['properties']['content']['maxLength'] = from_api['some_filefield']['properties']['content']['maxLength'] = 10000
        expected['some_imagefield']['properties']['content']['minLength'] = from_api['some_imagefield']['properties']['content']['minLength'] = 7000
        expected['some_namedbinimage']['x-options'] = {'backgroundFillColor': 'pink'}
        expected['some_multiplenamedbinimage']['items']['x-options'] = {'backgroundFillColor': 'white'}
        self.assertDictEqual(expected, from_api)
        # Test swagger ui
        client = self._login()
        response = client.get('/api/endpoint/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'drf-yasg/swagger-ui.html')
        with self.assertRaises(ValueError):
            json.loads(response.content.decode('utf-8'))

    def test_cookies_on_endpoint_calls(self):
        self.client.force_login(self.user)
        self.assertIn('sessionid', self.client.cookies)
        session_id = self.client.cookies['sessionid'].value
        results = self.bulk([
            {"method": "get", "path": "_lang"},
            {"method": "get", "path": "_openapi", "query": "format=openapi"}
        ], relogin=False)
        self.assertEqual(session_id, self.client.cookies['sessionid'].value)
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['count'], len(settings.LANGUAGES))
        self.assertIn('ETag', results[0]['headers'])
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['swagger'], '2.0')
        self.assertEqual(results[1]['data']['info']['x-settings']['logout_url'], self.logout_url)
        self.client.logout()

    @override_settings(
        CENTRIFUGO_PUBLIC_HOST='/notify',
        CENTRIFUGO_CLIENT_KWARGS={
            'address': 'https://localhost:8000',
            'api_key': 'XXX',
            'token_hmac_secret_key': 'YYY',
        })
    def test_openapi_schema_content(self):
        api = self.endpoint_schema()
        img_res_validator_data = {
            'min_width': 202,
            'max_width': 400,
            'min_height': 201,
            'max_height': 550,
            'extensions': [
                'image/jpeg',
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
            {'Main': ['id', 'name'], '': ['registerDate', 'posts', 'phone', 'masked', 'decimal']}
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
            api['definitions']['ExtraPost']['properties']['author'][X_OPTIONS]['model']['$ref'],
            '#/definitions/Author'
        )
        # Check properly format for RelatedListField
        self.assertEqual(api['definitions']['OneAuthor']['properties']['posts']['type'], 'array')
        self.assertEqual(api['definitions']['OneAuthor']['properties']['posts']['x-format'], 'table')
        self.assertEqual(api['definitions']['OneAuthor']['properties']['posts']['items']['type'], 'object')
        self.assertEqual(api['definitions']['OneAuthor']['properties']['posts']['items']['properties']['title']['description'], 'Some description')


        # Check properly format for RatingField
        self.assertEqual(
                api['definitions']['OneExtraPost']['properties']['rating'],
                {
                    'title': 'Rating',
                    'type': 'number',
                    'format': 'rating',
                    X_OPTIONS: {
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
                X_OPTIONS: {
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
                'properties': {
                    'content': {
                        'type': 'string',
                        'x-nullable': True,
                    },
                    'mediaType': {
                        'type': 'string',
                        'x-nullable': True,
                    },
                    'name': {
                        'type': 'string',
                        'x-nullable': True,
                    }
                },
                'title': 'Some namedbinimage',
                'type': 'object',
                'x-format': 'namedbinimage',
                'x-validators': {},
            }
        )
        self.assertDictEqual(
                api['definitions']['ModelWithBinaryFiles']['properties']['some_validatednamedbinimage']['x-validators'],
                img_res_validator_data
            )
        # Check properly format for MultipleNamedBinaryImageInJsonField
        self.assertDictEqual(
            api['definitions']['ModelWithBinaryFiles']['properties']['some_multiplenamedbinimage'],
            {
                'items': {
                    'properties': {
                        'content': {
                            'type': 'string',
                            'x-nullable': True,
                        },
                        'mediaType': {
                            'type': 'string',
                            'x-nullable': True,
                        },
                        'name': {
                            'type': 'string',
                            'x-nullable': True,
                        }
                    },
                    'type': 'object',
                    'x-format': 'namedbinimage',
                    'x-validators': {}
                },
                'title': 'Some multiplenamedbinimage',
                'type': 'array',
            }
        )
        self.assertDictEqual(
            api['definitions']['ModelWithBinaryFiles']['properties']['some_validatedmultiplenamedbinimage']['items']['x-validators'],
            img_res_validator_data
        )

        # Check fields with uuid as fk
        self.assertEqual(api['definitions']['ModelWithUuidPk']['properties']['id']['type'], 'string')
        self.assertEqual(api['definitions']['ModelWithUuidPk']['properties']['id']['format'], 'uuid')
        self.assertEqual(api['definitions']['ModelWithUuidFK']['properties']['fk']['type'], 'string')
        self.assertEqual(api['definitions']['ModelWithUuidFK']['properties']['fk']['format'], 'fk')

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
        self.assertTrue(api['paths']['/hosts/{id}/hosts/{hosts_id}/test/']['post']['x-require-confirmation'])
        self.assertEqual(api['paths']['/hosts/{id}/']['get']['x-subscribe-labels'], ['test_proj.HostGroup'])

        self.assertEqual(api['paths']['/hosts/']['get']['parameters'][2]['name'], 'ordering')
        self.assertEqual(api['paths']['/hosts/']['get']['parameters'][2]['type'], 'array')
        self.assertEqual(api['paths']['/hosts/']['get']['parameters'][2]['items']['type'], 'string')
        self.assertEqual(api['paths']['/hosts/']['get']['parameters'][2]['items']['format'], 'ordering_choices')

        # Test list only view
        self.assertIn('/hosts_list/', api['paths'])
        self.assertNotIn('/hosts_list/{id}/', api['paths'])
        hosts_list = api['paths']['/hosts_list/']
        self.assertNotIn('post', hosts_list)
        self.assertNotIn('delete', hosts_list)
        self.assertNotIn('patch', hosts_list)
        self.assertNotIn('put', hosts_list)

        # Test inherit actions or methods
        self.assertIn('/cachable/empty_action/', api['paths'])

        # Check depend fields
        self.assertEqual(api['definitions']['Variable']['properties']['key']['format'], 'fk')
        self.assertEqual(
            api['definitions']['Variable']['properties']['key'][X_OPTIONS],
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
            api['definitions']['OneSuperModelWithFK']['properties']['fk_with_filters'][X_OPTIONS]['filters'],
            {'rating': 5}
        )
        self.assertEqual(api['definitions']['Variable']['properties']['value']['format'], 'dynamic_fk')
        self.assertEqual(
            api['definitions']['Variable']['properties']['value'][X_OPTIONS],
            {"field": 'key', 'field_attribute': 'val_type'}
        )

        # Check that's schema is correct and fields are working
        host_obj = self.get_model_class('test_proj.HostList').objects.create(name='123')
        results = self.bulk([
            {'method': 'post', 'path': ['author'], 'data': dict(name="Some author")},
            {
                'method': 'post',
                 'path': ['author', '<<0[data][id]>>', 'post'],
                 'data': dict(title="title", text='txt', some_data='some data some data')
             },
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
        self.assertEqual(
            api['paths']['/listoffiles/']['get']['parameters'][1]['enum'],
            [""]+list(range(3))
        )

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
        self.assertDictEqual(api['definitions']['Host']['properties']['id'][X_OPTIONS]['redirect'], {
            'operation_name': 'files',
            'depend_field': None,
            'concat_field_name': False,
        })
        self.assertDictEqual(api['definitions']['FieldsTesting']['properties']['hosts_id'][X_OPTIONS]['redirect'], {
            'operation_name': 'hosts',
            'depend_field': None,
            'concat_field_name': False,
        })

        # Check translate model
        self.assertEqual(api['definitions']['Author']['x-translate-model'], 'Author')

        # Check phone field
        self.assertEqual(api['definitions']['OneAuthor']['properties']['phone']['format'], 'phone')

        # Check masked field
        self.assertEqual(api['definitions']['OneAuthor']['properties']['masked']['format'], 'masked')
        self.assertDictEqual(
            api['definitions']['OneAuthor']['properties']['masked'][X_OPTIONS],
            {'mask': {'mask': '000-000'}}
        )

        # Check decimal field
        self.assertEqual(api['definitions']['OneAuthor']['properties']['decimal']['format'], 'masked')
        self.assertEqual(api['definitions']['OneAuthor']['properties']['decimal']['default'], '13.37')
        self.assertDictEqual(
            api['definitions']['OneAuthor']['properties']['decimal'][X_OPTIONS],
            {'mask': r"/^-?\d{0,3}(\.\d{0,2})?$/"}
        )

        # Check DeepFk field
        self.assertEqual(api['definitions']['OnePost']['properties']['category']['format'], 'deep_fk')
        self.assertDictEqual(
            api['definitions']['OnePost']['properties']['category'][X_OPTIONS],
            {
                 'makeLink': True,
                 'model': {'$ref': '#/definitions/Category'},
                 'usePrefetch': True,
                 'value_field': 'id',
                 'view_field': 'name',
                 'filters': None,
                 'parent_field_name': 'parent',
                 'only_last_child': True,
            }
        )

        # Check dynamic field with complex types
        nested_model = {
            'type': 'object',
            'properties': {
                'field1': {'title': 'Field1', 'type': 'string', 'minLength': 1},
                'field2': {'title': 'Field2', 'type': 'integer'}
            },
            'required': ['field1', 'field2'],
            'x-properties-groups': {'': ['field1', 'field2']},
            'x-view-field-name': 'field2',
        }

        self.assertDictEqual(api['definitions']['DynamicFields']['properties']['dynamic_with_types'], {
            'title': 'Dynamic with types',
            'type': 'string',
            'format': 'dynamic',
            'x-options': {
                'choices': {},
                'field': 'field_type',
                'types': {
                    'boolean': 'boolean',
                    'many_serializers': {
                        'type': 'array',
                        'items': nested_model,
                    },
                    'integer': {
                        'type': 'integer',
                        'maximum': 1337,
                    },
                    'serializer': nested_model,
                    'image': {
                        'type': 'object',
                        'properties': {
                            'name': {'type': 'string', 'x-nullable': True},
                            'content': {'type': 'string', 'x-nullable': True},
                            'mediaType': {'type': 'string', 'x-nullable': True}
                        },
                        'x-format': 'namedbinimage',
                        'x-validators': {}
                    },
                    'context_depend': {
                        'minLength': 1,
                        'type': 'string',
                    }
                },
            },
        })
        self.assertDictEqual(api['definitions']['OneDynamicFields']['properties']['dynamic_with_types'], {
            'title': 'Dynamic with types',
            'type': 'string',
            'format': 'dynamic',
            'x-options': {
                'source_view': '<<parent>>.<<parent>>',
                'choices': {},
                'field': 'field_type',
                'types': {
                    'boolean': 'boolean',
                    'many_serializers': {
                        'type': 'array',
                        'items': nested_model,
                    },
                    'integer': {
                        'type': 'integer',
                        'maximum': 1337,
                    },
                    'serializer': nested_model,
                    'image': {
                        'type': 'object',
                        'properties': {
                            'name': {'type': 'string', 'x-nullable': True},
                            'content': {'type': 'string', 'x-nullable': True},
                            'mediaType': {'type': 'string', 'x-nullable': True}
                        },
                        'x-format': 'namedbinimage',
                        'x-validators': {}
                    },
                    'context_depend': {
                        'minLength': 1,
                        'type': 'string',
                    },
                    'another_serializer': {
                        'required': ['list_field'],
                        'type': 'object',
                        'properties': {
                            'list_field': {'type': 'array', 'items': {'type': 'string', 'minLength': 1}}
                        },
                        'x-properties-groups': {'': ['list_field']},
                        'x-view-field-name': 'list_field',
                    }
                },
            },
        })

        # Check hide non required fields option
        self.assertTrue(api['definitions']['SubVariables']['x-hide-not-required'])

        # Check public centrifugo address when absolute path is provided
        self.assertEqual(api['info']['x-centrifugo-address'], 'wss://vstutilstestserver/notify/connection/websocket')

        # Check csvfile schema
        self.assertDictEqual(
            api['definitions']['OnePost']['properties']['some_data'],
            {
                'type': 'string',
                'format': 'csvfile',
                'title': 'Some data',
                'maxLength': 1024,
                'minLength': 1,
                X_OPTIONS: {
                    'media_types': ['text/csv',],
                    'parserConfig': {
                        'delimiter': ';',
                    },
                    'minColumnWidth': 300,
                    'items': {
                        'type': 'object',
                        'required': ['some_data'],
                        'properties': {
                            'some_data': {
                                'type': 'string',
                                'title': 'Some data',
                                'maxLength': 300,
                                'minLength': 1,
                            },
                        },
                        'x-properties-groups': {'': ['some_data']},
                        'x-view-field-name': 'some_data',
                    },
                }
            }
        )

        # Check WYSIWYGField schema
        self.assertDictEqual(
            api['definitions']['OnePost']['properties']['text'],
            {
                'type': 'string',
                'format': 'wysiwyg',
                'title': 'Text',
            }
        )

        # Check query serializable params
        self.assertEqual(
            {'name': 'test_value', 'in': 'query', 'required': True, 'type': 'string', 'enum': ['TEST1', 'TEST2']},
            api['paths']['/files/query_serializer_test/']['get']['parameters'][0]
        )
        self.assertCount(api['paths']['/files/query_serializer_test/']['get']['parameters'], 1)
        self.assertFalse(api['paths']['/files/query_serializer_test/']['get']['x-list'])
        self.assertIn(
            {'name': 'test_value', 'in': 'query', 'required': True, 'type': 'string', 'enum': ['TEST1', 'TEST2']},
            api['paths']['/files/query_serializer_test_list/']['get']['parameters']
        )
        self.assertTrue(len(api['paths']['/files/query_serializer_test_list/']['get']['parameters']) > 1)
        self.assertTrue(api['paths']['/files/query_serializer_test_list/']['get']['x-list'])

        self.assertFalse(api['paths']['/files/is_list_false_action_test/']['get']['x-list'])
        self.assertEqual(len(api['paths']['/files/is_list_false_action_test/']['get']['parameters']), 0)

        self.assertTrue(api['paths']['/files/list_suffix_action_test/']['get']['x-list'])
        self.assertIn(
            {'name': 'test_value', 'in': 'query', 'required': True, 'type': 'string', 'enum': ['TEST1', 'TEST2']},
            api['paths']['/files/list_suffix_action_test/']['get']['parameters']
        )

        self.assertFalse(api['paths']['/hosts/instance_suffix_action_test/']['get']['x-list'])
        self.assertEqual(len(api['paths']['/hosts/instance_suffix_action_test/']['get']['parameters']), 0)

        # Check x-list param on get methods
        self.assertFalse(api['paths']['/files/query_serializer_test/']['get']['x-list'])
        self.assertTrue(api['paths']['/files/query_serializer_test_list/']['get']['x-list'])
        self.assertTrue(api['paths']['/files/']['get']['x-list'])
        self.assertTrue(api['paths']['/files/']['get']['x-list'])

        sub_path = '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/hosts/'
        self.assertTrue(api['paths'][sub_path]['get']['x-list'])
        sub_path = '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/subgroups/'
        self.assertTrue(api['paths'][sub_path]['get']['x-list'])

        path = '/author/{id}/check_named_response/'
        self.assertEqual(
            api['paths'][path]['post']['responses']['201']['schema']['$ref'],
            '#/definitions/CheckNamedResponse',
        )

        path = '/author/{id}/check_named_response_as_result_serializer/'
        self.assertEqual(
            api['paths'][path]['post']['responses']['201']['schema']['$ref'],
            '#/definitions/CheckNamedResponse',
        )

        path = '/author/{id}/empty_action/'
        self.assertCount(api['paths'][path], 2)
        self.assertIn('post', api['paths'][path])
        self.assertIn('parameters', api['paths'][path])
        self.assertEqual(api['paths'][path]['post']['responses']['201']['schema']['$ref'], '#/definitions/Empty')
        self.assertEqual(api['paths'][path]['post']['x-title'], 'Empty action')

        path = '/author/{id}/author_profile/'
        self.assertCount(api['paths'][path], 4)
        self.assertIn('get', api['paths'][path])
        self.assertIn('put', api['paths'][path])
        self.assertIn('delete', api['paths'][path])
        self.assertIn('parameters', api['paths'][path])
        self.assertEqual(api['paths'][path]['get']['responses']['200']['schema']['$ref'], '#/definitions/AuthorProfile')
        self.assertEqual(api['paths'][path]['put']['responses']['200']['schema']['$ref'], '#/definitions/AuthorProfile')
        self.assertIn('204', api['paths'][path]['delete']['responses'])
        self.assertFalse(api['paths'][path]['get']['x-list'])
        self.assertFalse(api['paths'][path]['put']['x-multiaction'])

        path = '/author/{id}/simple_property_action/'
        self.assertCount(api['paths'][path], 5)
        self.assertIn('get', api['paths'][path])
        self.assertIn('put', api['paths'][path])
        self.assertIn('patch', api['paths'][path])
        self.assertIn('delete', api['paths'][path])
        self.assertIn('parameters', api['paths'][path])
        self.assertEqual(api['paths'][path]['get']['responses']['200']['schema']['$ref'], '#/definitions/PropertyAuthor')
        self.assertEqual(api['paths'][path]['put']['responses']['200']['schema']['$ref'], '#/definitions/PropertyAuthor')
        self.assertEqual(api['paths'][path]['patch']['responses']['200']['schema']['$ref'], '#/definitions/PropertyAuthor')
        self.assertIn('204', api['paths'][path]['delete']['responses'])
        self.assertFalse(api['paths'][path]['get']['x-list'])
        self.assertEqual(api['paths'][path]['get']['description'], 'Simple property description')
        self.assertNotIn('x-title', api['paths'][path]['get'])
        self.assertEqual(len(api['paths'][path]['get']['parameters']), 0)

        path = '/author/{id}/simple_property_action_with_query/'
        self.assertCount(api['paths'][path], 2)
        self.assertIn('get', api['paths'][path])
        self.assertIn('parameters', api['paths'][path])
        self.assertEqual(api['paths'][path]['get']['responses']['200']['schema']['$ref'], '#/definitions/PropertyAuthor')
        self.assertFalse(api['paths'][path]['get']['x-list'])
        self.assertEqual(len(api['paths'][path]['get']['parameters']), 1)
        self.assertEqual(api['paths'][path]['get']['x-title'], 'Get query')
        self.assertEqual(api['paths'][path]['get']['x-icons'], ['fas', 'fa-pen'])


        path = '/author/phone_book/'
        self.assertCount(api['paths'][path], 2)
        self.assertIn('count', api['paths'][path]['get']['responses']['200']['schema']['properties'])
        self.assertIn('results', api['paths'][path]['get']['responses']['200']['schema']['properties'])
        self.assertEqual(
            api['paths'][path]['get']['responses']['200']['schema']['properties']['results']['items']['$ref'],
            '#/definitions/PhoneBook',
        )

        user = self._create_user(is_super_user=False, is_staff=False)
        with self.user_as(self, user):
            schema = self.endpoint_schema()
            self.assertTrue(schema['definitions']['User']['properties']['is_staff']['readOnly'])

    def test_search_fields(self):
        self.assertEqual(
            self.get_model_class('test_proj.Variable').generated_view.search_fields,
            ('key', 'value')
        )
        self.assertEqual(
            self.get_model_class('test_proj.Author').generated_view.search_fields,
            ('name', 'phone', 'masked')
        )

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


class EndpointTestCase(BaseTestCase):
    use_msgpack = True

    def test_auth(self):
        # Check public schema access
        result = self.get_result('get', '/api/endpoint/?format=openapi', relogin=False)
        self.assertEqual(result['info']['x-user-id'], None)

        user = self._create_user()
        auth_str = b64encode(f'{user.data["username"]}:{user.data["password"]}'.encode()).decode('ascii')
        basic_client = self.client_class(HTTP_AUTHORIZATION=f'Basic {auth_str}')
        response = basic_client.put('/api/endpoint/')
        self.assertEqual(response.status_code, 200)

        response = basic_client.put('/api/endpoint/', ormsgpack.packb({
            'path': '/request_info/',
            'version': 'v2',
            'method': 'get'
        }), content_type='application/msgpack', HTTP_ACCEPT='application/msgpack')
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
        self.assertEqual('get', response[0]['method'])
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
        self.assertEqual('get', response[0]['method'])
        self.assertEqual('/api/v1/user/?limit=5', response[0]['path'])
        self.assertEqual(200, response[0]['status'])

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
        self.assertTrue('Page not found' in response[0]['data']['detail'])

    def test_testing_tool(self):
        with self.assertRaises(AssertionError):
            self.get_model_class('SomeNotFound')
        self.assertEqual(self.get_model_class(File), File)

    def test_searching(self):
        Host.objects.all().delete()

        iterations = 10
        for i in range(iterations):
            Host.objects.create(name=f'test_{i}')
            Host.objects.create(name=f'other_{i}')
            Host.objects.create(name=f'another_{i}')

        results = self.bulk([
            {
                'path': 'subhosts',
                'method': 'get',
                'query': '__search=test'
            },
            {
                'path': 'subhosts',
                'method': 'get',
                'query': '__search=other'
            },
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['count'], iterations)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[1]['data']['count'], iterations * 2)

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
                'method': 'get',
                'let': 'subhost_list'
            },
            # Template in path list
            {
                'path': ['subhosts', '<<subhost_list[data][results][0][id]>>'],
                'method': 'get'
            },
            # Template in data
            {
                'path': ['subhosts', '<<subhost_list[data][results][1][id]>>'],
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
        self.assertEqual(response[3]['status'], 200, response[3]['data'])
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
        self.assertIn('request_info_cookie', self.client.cookies)
        self.assertEqual(self.client.cookies['request_info_cookie'].value, 'request_info_cookie_value')

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


    @override_settings(CENTRIFUGO_CLIENT_KWARGS={
        'address': 'https://localhost:8000',
        'api_key': "XXX",
        'token_hmac_secret_key': "YYY"
    }, CENTRIFUGO_PUBLIC_HOST='https://public:8000/api')
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


class EmailSendingTestCase(BaseTestCase):

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


class ValidatorsTestCase(BaseTestCase):
    use_msgpack = True
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
        with self.assertRaisesMessage(ValidationError, '[ErrorDetail(string=\'Unsupported image file format '
                                                       '"cat.bmp" (image/x-ms-bmp) '
                                                       'is not in listed supported types (image/jpeg).\', '
                                                       'code=\'invalid\')]'):
            img_validator({
                'name': 'cat.bmp',
                'content': 'cdef',
            })

        # check file with no extension
        with self.assertRaisesMessage(ValidationError, '[ErrorDetail(string=\'Unsupported image file format '
                                                       '"qwerty123" () '
                                                       'is not in listed supported types (image/jpeg).\', '
                                                       'code=\'invalid\')]'):
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
        img_resolution_validator = ImageResolutionValidator(max_width=666, max_height=720)

        with self.assertRaises(ValidationError):
            img_resolution_validator(self.valid_image_content_dict)

        img_resolution_validator = ImageResolutionValidator(max_width=1280, max_height=720)

        img_resolution_validator(self.valid_image_content_dict)

    @override_settings(ALLOW_AUTO_IMAGE_RESIZE=True)
    def test_image_auto_resize(self):
        base_path = Path(DIR_PATH, '1280_720_jpeg.jpeg')
        jpeg_b64 = base64.b64encode(base_path.read_bytes()).decode('utf-8')
        png_b64 = base64.b64encode(base_path.with_name('1280_720_png.png').read_bytes()).decode('utf-8')
        tall_img_b64 = base64.b64encode(base_path.with_name('tall_image.jpg').read_bytes()).decode('utf-8')
        small_img_b64 = base64.b64encode(base_path.with_name('small_image.png').read_bytes()).decode('utf-8')
        resize_jpeg_image_content_dict = {
            'name': '1280_720_jpeg.jpeg',
            'content': jpeg_b64,
            'mediaType': 'images/jpeg'
        }
        resize_png_image_content_dict = {
            'name': '1280_720_png.png',
            'content': png_b64,
            'mediaType': 'images/png'
        }
        tall_image_content_dict = {
            'name': 'tall.jpg',
            'content': tall_img_b64,
            'mediaType': 'images/jpg'
        }
        small_image_content_dict = {
            'name': 'small.png',
            'content': small_img_b64,
            'mediaType': 'images/png'
        }

        valid_image_hash = hash(resize_png_image_content_dict['content'])
        expected_new_image_size = 600, round(600/1280 * 720)
        results = self.bulk([
            # 0
            {
                'method': 'post',
                'path': ['somethingwithimage'],
                'data': {'name': 'Resized img', 'invalidimage': resize_png_image_content_dict},
                'headers': {"HTTP_AUTO_RESIZE_IMAGE": 'true'},
            },
            # 1
            {
                'method': 'post',
                'path': ['somethingwithimage'],
                'data': {'name': 'Unresized invalid img 1', 'invalidimage': resize_png_image_content_dict},
                'headers': {"HTTP_AUTO_RESIZE_IMAGE": 'tqwt'},
            },
            # 2
            {
                'method': 'post',
                'path': ['somethingwithimage'],
                'data': {'name': 'Unresized invalid img 2', 'invalidimage': resize_png_image_content_dict},
            },
            # 3
            {
                'method': 'post',
                'path': ['somethingwithimage'],
                'data': {'name': 'Unresized valid img 1', 'validimage': resize_png_image_content_dict},
                'headers': {"HTTP_AUTO_RESIZE_IMAGE": 'tqwt'},
            },
            # 4
            {
                'method': 'post',
                'path': ['somethingwithimage'],
                'data': {'name': 'Unresized valid img 2', 'validimage': resize_png_image_content_dict},
                'headers': {"HTTP_AUTO_RESIZE_IMAGE": 'true'},
            },
            # 5
            {
                'method': 'post',
                'path': ['somethingwithimage'],
                'data': {'name': 'JPEG checking format saving', 'invalidimage': resize_jpeg_image_content_dict},
                'headers': {"HTTP_AUTO_RESIZE_IMAGE": 'true'},
            },
            # 6
            {
                'method': 'get',
                'path': ['somethingwithimage', '<<0[data][id]>>'],
            },
            # 7
            {
                'method': 'get',
                'path': ['somethingwithimage', '<<3[data][id]>>'],
            },
            # 8
            {
                'method': 'get',
                'path': ['somethingwithimage', '<<4[data][id]>>'],
            },
            # 9
            {
                'method': 'get',
                'path': ['somethingwithimage', '<<5[data][id]>>'],
            },
            # 10
            {
                'method': 'post',
                'path': ['somethingwithimage'],
                'data': {'name': 'Resized img with horizontal margin', 'imagewithmarginapplying': resize_png_image_content_dict},
                'headers': {"HTTP_AUTO_RESIZE_IMAGE": 'true'},
            },
            # 11
            {
                'method': 'get',
                'path': ['somethingwithimage', '<<10[data][id]>>'],
            },
            # 12
            {
                'method': 'post',
                'path': ['somethingwithimage'],
                'data': {'name': 'Resized img with vertical margin', 'imagewithmarginapplying': tall_image_content_dict},
                'headers': {"HTTP_AUTO_RESIZE_IMAGE": 'true'},
            },
            # 13
            {
                'method': 'get',
                'path': ['somethingwithimage', '<<12[data][id]>>'],
            },
            # 14
            {
                'method': 'post',
                'path': ['somethingwithimage'],
                'data': {'name': 'Resized small img', 'imagewithmarginapplying': small_image_content_dict},
                'headers': {"HTTP_AUTO_RESIZE_IMAGE": 'true'},
            },
            # 15
            {
                'method': 'get',
                'path': ['somethingwithimage', '<<14[data][id]>>'],
            },
        ])
        # invalid image with correct AUTO_RESIZE_IMAGE header
        self.assertEqual(results[0]['status'], 201)
        # invalid image without correct AUTO_RESIZE_IMAGE header
        for i in range(1, 3):
            self.assertEqual(results[i]['status'], 400)
            self.assertEqual(''.join(results[i]['data']['invalidimage']),
                             'Invalid image size orientations: height,width. Current image size: 720x1280')
        # valid image
        for i in range(3, 5):
            self.assertEqual(results[i]['status'], 201)
        # getting correct images
        for i in range(6, 9):
            self.assertEqual(results[6]['status'], 200)
        # if satisfied, image must not be changed
        self.assertEqual(hash(results[7]['data']['validimage']['content']), valid_image_hash)
        # Check name which changed in handler
        self.assertEqual(results[7]['data']['validimage']['name'], '1280_720.png')
        self.assertEqual(hash(results[8]['data']['validimage']['content']), valid_image_hash)

        img_png = Image.open(BytesIO(base64.b64decode(results[0]['data']['invalidimage']['content'])))
        img_jpeg = Image.open(BytesIO(base64.b64decode(results[9]['data']['invalidimage']['content'])))
        self.assertEqual(img_png.format, "PNG")
        self.assertEqual(img_jpeg.format, "JPEG")
        self.assertEqual(img_png.size, expected_new_image_size)
        self.assertEqual(img_jpeg.size, expected_new_image_size)

        # horizontal margin
        self.assertEqual(results[10]['status'], 201)
        self.assertEqual(results[11]['status'], 200)
        img_with_horizontal_margin = Image.open(
            BytesIO(base64.b64decode(results[11]['data']['imagewithmarginapplying']['content'])))
        self.assertEqual(img_with_horizontal_margin.format, 'PNG')
        self.assertEqual(img_with_horizontal_margin.size, (600, 600))
        # vertical margin
        self.assertEqual(results[12]['status'], 201)
        self.assertEqual(results[13]['status'], 200)
        img_with_vertical_margin = Image.open(
            BytesIO(base64.b64decode(results[13]['data']['imagewithmarginapplying']['content'])))
        self.assertEqual(img_with_vertical_margin.format, 'JPEG')
        self.assertEqual(img_with_vertical_margin.size, (600, 600))
        # small image resize
        self.assertEqual(results[14]['status'], 201)
        self.assertEqual(results[15]['status'], 200)
        small_img = Image.open(
            BytesIO(base64.b64decode(results[15]['data']['imagewithmarginapplying']['content'])))
        self.assertEqual(small_img.format, 'PNG')
        self.assertEqual(small_img.size, (600, 600))

        # skipping file handling when file name needs to encode/decode
        image_with_letters_to_encode = {
            'name': 'супер пупер картинка.png',
            'content': png_b64,
            'mediaType': 'images/png'
        }
        image_from_media_with_encoded_letters = {
            'name': 'супер пупер картинка.png',
            'content': '/media/%D1%81%D1%83%D0%BF%D0%B5%D1%80%20%D0%BF%D1%83%D0%BF%D0%B5%D1%80%20%D0%BA%D0%B0%D1%80%D1%82%D0%B8%D0%BD%D0%BA%D0%B0.png',
            'mediaType': ''
        }
        results = self.bulk([
            {
                'method': 'post',
                'path': ['somethingwithimage'],
                'data': {'name': 'Картинка с русскими буквами', 'invalidimage': image_with_letters_to_encode},
                'headers': {"HTTP_AUTO_RESIZE_IMAGE": 'true'},
            },
            {
                'method': 'post',
                'path': ['somethingwithimage'],
                'data': {'name': 'Картинка которая не должна валидироваться', 'invalidimage': image_from_media_with_encoded_letters},
                'headers': {"HTTP_AUTO_RESIZE_IMAGE": 'true'},
            },
            {
                'method': 'get',
                'path': ['somethingwithimage', '<<0[data][id]>>'],
            },
            {
                'method': 'get',
                'path': ['somethingwithimage', '<<1[data][id]>>'],
            },
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[3]['status'], 200)

        self.assertEqual(resize_image(small_img, 300, 300).size, (300, 300))

    @override_settings(ALLOW_AUTO_IMAGE_RESIZE=False)
    def test_resize_settings_constraint(self):
        base_path = Path(DIR_PATH, '1280_720_jpeg.jpeg')
        png_b64 = base64.b64encode(base_path.with_name('1280_720_png.png').read_bytes()).decode('utf-8')
        resize_png_image_content_dict = {
            'name': '1280_720_png.png',
            'content': png_b64,
            'mediaType': 'images/png'
        }
        results = self.bulk([
            # 0
            {
                'method': 'post',
                'path': ['somethingwithimage'],
                'data': {'name': 'Resized img', 'invalidimage': resize_png_image_content_dict},
                'headers': {"HTTP_AUTO_RESIZE_IMAGE": 'true'},
            }
        ])
        self.assertEqual(''.join(results[0]['data']['invalidimage']),
                         'Invalid image size orientations: height,width. Current image size: 720x1280')


class LangTestCase(BaseTestCase):
    use_msgpack = True

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
        self.assertEqual(201, results[0]['status'], results[0]['data'])
        self.assertEqual(test_results[0], results[0]['data'])
        # test not translated
        self.assertEqual(201, results[1]['status'])
        self.assertEqual(test_results[1], results[1]['data'])
        # Custom translations
        self.assertEqual(201, results[2]['status'])
        self.assertEqual("Успешно переведено", results[2]['data']['translated'])

        # all translations equal
        ru: Language = Language.objects.get(code='ru')
        ru_server_translations_keys = list(
            filter(
                lambda x: x not in (
                    'Hello world!',
                    'Some shared translation',
                    'Server translation',
                    'Some shared translation',
                    'проверка перевода',
                ),
                ru.server_translations.keys()
            )
        )
        for check_lang in Language.objects.exclude(code__in=['ru', 'uk', 'en']):
            self.assertEqual(
                ru_server_translations_keys,
                list(check_lang.server_translations.keys()),
                (
                    f'Looks like Russian and {check_lang.code} ({check_lang.name}) translations are not equivalent:'
                    f'{set(ru_server_translations_keys).symmetric_difference(check_lang.server_translations.keys())}'
                )
            )

        # test translate tag for context variables
        context_variable = 'Hello world!'
        request = RequestFactory().get('/')
        request.user = AnonymousUser()
        request.language = Language.objects.get(code='ru')

        result = get_render('test_lang_tmplt.html', {'context_variable': context_variable, 'request': request})
        self.assertEqual(result, 'Привет мир!\n')
        result = get_render('test_lang_tmplt.html', {'context_variable': context_variable}, trans='ru')
        self.assertEqual(result, 'Привет мир!\n')
        result = get_render('test_lang_tmplt.html', {'context_variable': context_variable, '__lang__': request.language}, trans='ru')
        self.assertEqual(result, 'Привет мир!\n')

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

    def test_server_translation(self):
        bulk_data = [
            dict(path=['_lang', 'ru'], method='get'),
        ]
        results = self.bulk(bulk_data)
        ru_lang_obj = Language.objects.get(code='ru')

        self.assertEqual(results[0]['status'], 200)
        self.assertNotIn('Server translation', results[0]['data']['translations'].keys())
        self.assertEqual(ru_lang_obj.translate('Server translation'), 'Серверный перевод')

        self.assertEqual(results[0]['data']['translations']['Some shared translation'],
                         'Перевод, который может быть перезаписан серверным переводом')
        self.assertEqual(ru_lang_obj.translate('Some shared translation'), 'Серверный перевод имеет более высокий приоритет')


class ProjectTestCase(BaseTestCase):
    use_msgpack = True

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

    def test_model_with_fk_uuid(self):
        results = self.bulk([
            {'method': "post", 'path': ['uuid_as_pk']}
            for _ in range(3)
        ] + [
            {'method': "post", 'path': ['uuid_as_fk'], 'data': {'fk': f'<<{i}[data][id]>>'}}
            for i in range(3)
        ] + [{'method': "get", 'path': ['uuid_as_fk']}])
        for result in results[:-1]:
            self.assertEqual(result['status'], 201)

        self.assertEqual(results[-1]['status'], 200)
        self.assertEqual(results[-1]['data']['count'], 3)

    def test_make_action(self):
        author1 = Author.objects.create(name='Author1', phone='')
        author2 = Author.objects.create(name='Author2', phone='')
        author3 = Author.objects.create(name='Author3', phone='88008008880')

        results = self.bulk([
            # [0] Simple empty action
            {'method': 'post', 'path': ['author', author1.id, 'empty_action'], 'data': {}},
            # [1] Simple method action with result
            {'method': 'post', 'path': ['author', author1.id, 'check_named_response'], 'data': {}},
            # [2-4] Simple action check
            {'method': 'get', 'path': ['author', author1.id, 'author_profile']},
            {'method': 'put', 'path': ['author', author1.id, 'author_profile'], "data": {"phone": "88008008880", "referer": author2.id}},
            {'method': 'get', 'path': ['author', author1.id, 'author_profile']},
            {'method': 'delete', 'path': ['author', author1.id, 'author_profile']},
            {'method': 'get', 'path': ['author', author1.id, 'author_profile']},
            # [7-11] Simple action check
            {'method': 'get', 'path': ['author', author2.id, 'simple_property_action']},
            {'method': 'put', 'path': ['author', author2.id, 'simple_property_action'], "data": {"phone": "88008008880"}},
            {'method': 'get', 'path': ['author', author2.id, 'simple_property_action']},
            {'method': 'delete', 'path': ['author', author2.id, 'simple_property_action']},
            {'method': 'get', 'path': ['author', author2.id, 'simple_property_action']},
            # [12-14] Check query serializer
            {'method': 'get', 'path': ['author', author3.id, 'simple_property_action_with_query']},
            {'method': 'get', 'path': ['author', author3.id, 'simple_property_action_with_query'], 'query': 'phone=123'},
            {'method': 'get', 'path': ['author', author3.id, 'simple_property_action_with_query'], 'query': 'phone=12345678'},
            # [15] Check list page
            {'method': 'get', 'path': ['author', 'phone_book']},
            # [16] Simple method action with result_serializer_class
            {'method': 'post', 'path': ['author', author1.id, 'check_named_response_as_result_serializer'], 'data': {}},

        ])

        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[0]['data'], {})

        self.assertEqual(results[1]['status'], 201)
        self.assertEqual(results[1]['data'], {"detail": "OK"})

        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['data'], {"phone": "", "referer": None})
        self.assertEqual(results[3]['status'], 200)
        self.assertEqual(results[3]['data'], {"phone": "88008008880", "referer": author2.id})
        self.assertEqual(results[4]['status'], 200)
        self.assertEqual(results[4]['data'], {"phone": "88008008880", "referer": author2.id})
        self.assertEqual(results[5]['status'], 204)
        self.assertEqual(results[6]['status'], 404)

        self.assertEqual(results[7]['status'], 200)
        self.assertEqual(results[7]['data'], {"phone": ""})
        self.assertEqual(results[8]['status'], 200)
        self.assertEqual(results[8]['data'], {"phone": "88008008880"})
        self.assertEqual(results[9]['status'], 200)
        self.assertEqual(results[9]['data'], {"phone": "88008008880"})
        self.assertEqual(results[10]['status'], 204)
        self.assertEqual(results[11]['status'], 200)
        self.assertEqual(results[11]['data'], {"phone": ""})

        self.assertEqual(results[12]['status'], 200)
        self.assertEqual(results[12]['data'], {"phone": "88008008880"})
        self.assertEqual(results[13]['status'], 400)
        self.assertEqual(results[13]['data'], {"phone": ['Ensure this field has at least 8 characters.']})
        self.assertEqual(results[14]['status'], 200)
        self.assertEqual(results[14]['data'], {"phone": None})

        self.assertEqual(results[15]['status'], 200)
        valid_results = [{"name": a.name, "phone": a.phone, "referer": a.referer} for a in Author.objects.all()]
        self.assertEqual(results[15]['data'], {"count": len(valid_results), "results": valid_results})

        self.assertEqual(results[16]['status'], 201)
        self.assertEqual(results[16]['data'], {"detail": "OK"})

        response = self.client.get(f'/api/v1/author/{author3.id}/get_file/', HTTP_ACCEPT_CONTENT='text/plain')
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response, FileResponse)
        self.assertEqual(response.as_attachment, True)
        self.assertEqual(response.filename, f'{author3.id}.json')

    def test_crontab_field(self):
        results = self.bulk([
            # With uncomplete args
            {'method': 'post', 'path': 'modelwithcrontab', 'data': {'cron': '0'}},
            # With complete args
            {'method': 'post', 'path': 'modelwithcrontab', 'data': {'cron': '0 0 1 1 *'}},
            # With slash, - and commas
            {'method': 'post', 'path': 'modelwithcrontab', 'data': {'cron': '*/10 8-9 1 1 *'}},
            # With combo all of them
            {'method': 'post', 'path': 'modelwithcrontab', 'data': {'cron': '2-8/2,*/15'}},
            # With too long string
            {'method': 'post', 'path': 'modelwithcrontab', 'data': {'cron': '0 0 1 1 0 0'}},
            # With invalid data in minutes
            {'method': 'post', 'path': 'modelwithcrontab', 'data': {'cron': 'inv'}},
            # With invalid data in minutes
            {'method': 'post', 'path': 'modelwithcrontab', 'data': {'cron': '*/45.1'}},
            # With invalid syntax
            {'method': 'post', 'path': 'modelwithcrontab', 'data': {'cron': '/'}},
            {'method': 'post', 'path': 'modelwithcrontab', 'data': {'cron': '//'}},
            {'method': 'post', 'path': 'modelwithcrontab', 'data': {'cron': '-'}},
            {'method': 'post', 'path': 'modelwithcrontab', 'data': {'cron': '--'}},
            # Check in list view
            {'method': 'get', 'path': 'modelwithcrontab'},
        ])

        for response in results[:4]:
            self.assertEqual(response['status'], 201)

        self.assertEqual(results[4]['status'], 400)
        self.assertEqual(results[4]['data']['cron'][0], 'There are to many columns with crontab values.')
        self.assertEqual(results[5]['status'], 400)
        self.assertEqual(results[5]['data']['cron'][0], 'Invalid minute range. Valid choices in 0-59 range.')
        self.assertEqual(results[6]['status'], 400)
        self.assertEqual(results[6]['data']['cron'][0], 'Invalid delimiter value in minute. Must be integer.')
        self.assertEqual(results[7]['status'], 400)
        self.assertEqual(results[7]['data']['cron'][0], 'Invalid crontab syntax.')
        self.assertEqual(results[8]['status'], 400)
        self.assertEqual(results[8]['data']['cron'][0], 'Invalid crontab syntax.')
        self.assertEqual(results[9]['status'], 400)
        self.assertEqual(results[9]['data']['cron'][0], 'Invalid crontab syntax.')
        self.assertEqual(results[10]['status'], 400)
        self.assertEqual(results[10]['data']['cron'][0], 'Invalid crontab syntax.')

        self.assertEqual(results[-1]['status'], 200)

        items = [r['cron'] for r in results[-1]['data']['results']]
        self.assertEqual(items[0], '0 * * * *')
        self.assertEqual(items[1], '0 0 1 1 *')
        self.assertEqual(items[2], '*/10 8-9 1 1 *')
        self.assertEqual(items[3], '2-8/2,*/15 * * * *')

    def test_authentication_classes_none(self):
        results = self.bulk([
            {"method": 'get', "path": ['hosts_without_auth']},
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertEqual(results[0]['data']['count'], Host.objects.count())

        self.get_result(
            'post',
            self.get_url('hosts_without_auth'),
            data={},
            code=201,
            HTTP_ACCEPT_ENCODING='gzip',
        )

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

        self.client.cookies['lang'] = 'ru'
        results_ru = self.bulk([
            {'method': 'get', 'path': ['cachable'], 'headers': {'HTTP_IF_NONE_MATCH': results[0]['headers']['ETag']}},
            {'method': 'get', 'path': ['cachable'], 'headers': {'HTTP_IF_NONE_MATCH': '<<0[headers][ETag]>>'}},
        ])
        self.assertEqual(results_ru[0]['status'], 200)
        self.assertEqual(results_ru[1]['status'], 304)
        self.assertNotEqual(results[0]['headers']['ETag'], results_ru[0]['headers']['ETag'])

        results = self.bulk([
            {'method': 'get', 'path': ['cachable', 'non_cached']},
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertNotIn('ETag', results[0]['headers'])

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
        self.assertEqual(results[-2]['status'], 200, results[-2]['data'])
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
            LOWER_VALUE = BaseEnum.LOWER
            upper_value = BaseEnum.UPPER
            SAME_VALUE = BaseEnum.SAME

        self.assertFalse(FieldChoices.FIRST.not_equal('FIRST'))
        self.assertTrue(FieldChoices.SECOND.is_equal('SECOND'))
        self.assertFalse(FieldChoices.THIRD.not_equal('THIRD'))
        self.assertFalse(FieldChoices.LOWER_VALUE.not_equal('lower_value'))
        self.assertFalse(FieldChoices.upper_value.not_equal('UPPER_VALUE'))
        self.assertFalse(FieldChoices.SAME_VALUE.not_equal('SAME_VALUE'))
        self.assertListEqual(
            list(FieldChoices.get_names()),
            ['FIRST', 'SECOND', 'THIRD', 'LOWER_VALUE', 'upper_value', 'SAME_VALUE']
        )
        self.assertListEqual(
            FieldChoices.to_choices(),
            [
                ('FIRST', 'FIRST',),
                ('SECOND', 'SECOND'),
                ('THIRD', 'THIRD'),
                ('lower_value', 'lower_value'),
                ('UPPER_VALUE', 'UPPER_VALUE'),
                ('SAME_VALUE', 'SAME_VALUE'),
            ]
        )

        self.assertTrue({"FIRST": True}.get(FieldChoices.FIRST))
        self.assertTrue({"FIRST": True}[FieldChoices.FIRST])
        self.assertTrue({"lower_value": True}.get(FieldChoices.LOWER_VALUE))
        self.assertTrue({"UPPER_VALUE": True}.get(FieldChoices.upper_value))
        self.assertTrue({"SAME_VALUE": True}.get(FieldChoices.SAME_VALUE))

        self.assertEqual(repr(FieldChoices.FIRST.name), repr(FieldChoices.FIRST))
        self.assertEqual(FieldChoices.LOWER_VALUE.value, 'lower_value')
        self.assertEqual(FieldChoices.upper_value.value, 'UPPER_VALUE')
        self.assertEqual(FieldChoices.SAME_VALUE.value, 'SAME_VALUE')

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

    def test_swagger_schema(self):
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
            hostgroup_props['parent'][X_OPTIONS]['model']['$ref'],
            '#/definitions/Host'
        )
        self.assertEqual(
            hostgroup_props['parent'][X_OPTIONS]['value_field'], 'id'
        )
        self.assertEqual(
            hostgroup_props['parent'][X_OPTIONS]['view_field'], 'name'
        )
        # Check file and secret_file fields
        self.assertEqual(hostgroup_props['file']['type'], 'string')
        self.assertEqual(hostgroup_props['file']['format'], 'file')
        self.assertEqual(hostgroup_props['file']['x-options']['media_types'], ['text/markdown',])
        self.assertEqual(hostgroup_props['secret_file']['type'], 'string')
        self.assertEqual(hostgroup_props['secret_file']['format'], 'secretfile')
        self.assertEqual(hostgroup_props['secret_file']['x-options']['media_types'], ['*/*',])

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

        should_not_be = [
            # this actions shouldnot be in schema
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/hidden_hosts/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/hidden_hosts/{hidden_hosts_id}/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/hidden_hosts/{hidden_hosts_id}/test/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/hidden_hosts/{hidden_hosts_id}/test2/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/hidden_hosts/{hidden_hosts_id}/test3/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/subhosts/test/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/subhosts/test2/',
            '/deephosts/{id}/subdeephosts/{subdeephosts_id}/subhosts/test3/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/subhosts/test/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/subhosts/test2/',
            '/deephosts/{id}/subsubhosts/{subsubhosts_id}/subdeephosts/{subdeephosts_id}/subhosts/test3/',
            '/hosts/{id}/subhosts/test/',
            '/hosts/{id}/subhosts/test2/',
            '/hosts/{id}/subhosts/test3/',
        ]

        for url in urls:
            self.assertIn(url, data['paths'])

        for url in should_not_be:
            self.assertNotIn(url, data['paths'])

        self.assertNotIn('/testbinaryfiles2/', data['paths'])

        # Check useFetch and makeLink properties
        definitions = data['definitions']

        properties = definitions['OneSuperModelWithFK']['properties']['some_fk'][X_OPTIONS]
        self.assertEqual(properties['usePrefetch'], True)
        self.assertEqual(properties['makeLink'], True)

        properties = definitions['OneSuperModelWithFK']['properties']['no_prefetch_and_link_fk'][X_OPTIONS]
        self.assertEqual(properties['usePrefetch'], False)
        self.assertEqual(properties['makeLink'], False)

        properties = definitions['OneSuperModelWithFK']['properties']['multiselect']['items'][X_OPTIONS]
        self.assertEqual(properties['usePrefetch'], False)
        self.assertEqual(properties['makeLink'], True)

        self.assertEqual(
            data['definitions']['ModelWithCrontabField']['properties']['cron']['format'],
            'crontab'
        )

        self.assertEqual(
            data['paths']['/hosts/{id}/hosts/{hosts_id}/test3/']['post']['x-title'],
            'Test 3 action'
        )
        self.assertEqual(
            data['paths']['/hosts/{id}/hosts/{hosts_id}/test3/']['post']['x-icons'],
            ["fas", "fa-calculator"]
        )

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

        # test FkModelField autocomplete_property
        changed_fk_model = self.get_model_class('test_proj.ModelWithChangedFk')
        changed_pk = self.get_model_class('test_proj.ChangedPkField')
        value = changed_pk.objects.create(reg_number='TW23', name='test')
        value2 = changed_pk.objects.create(reg_number='TW24', name='test')
        field = fields.FkModelField(select=changed_pk, autocomplete_property='reg_number', field_type=str)
        self.assertEqual(field.to_representation(value), value.reg_number)
        results = self.bulk([
            {
                'method': 'post',
                'path': 'test_changed_fk',
                'data': {'name': 'test', 'relation': value.reg_number}
            },
            {
                'method': 'patch',
                'path': ['test_changed_fk', '<<0[data][id]>>'],
                'data': {'relation': value2.reg_number}
            }
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(changed_fk_model.objects.get(id=results[0]['data']['id']).relation, value2)

    def test_model_related_list_field(self):
        date = '2021-01-20T00:26:38Z'
        author_1 = Author.objects.create(name='author_1', registerDate=date)
        post_1 = Post.objects.create(author=author_1, title='post_1')
        post_2 = Post.objects.create(author=author_1, title='post_2')
        test_data = {
            'id': author_1.id,
            'name': author_1.name,
            'phone': None,
            'masked': None,
            'decimal': '13.37',
            'registerDate': date,
            'posts': [
                {
                    'title': post_1.title
                },
                {
                    'title': post_2.title
                }
            ],
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
            author_1.post.create(title=f'post_{i}', some_data=f'some_data{i}')
        for i in range(author_2_post_count):
            author_2.post.create(title=f'post_{i}', some_data=f'some_data{i}')

        results = self.bulk([
            {'method': "get", "path": ["post"]},
            {'method': "get", "path": ["post"], "query": f"author={author_1.name}"},
            {'method': "get", "path": ["post"], "query": f"author={author_1.id}"},
            {'method': "get", "path": ["post"], "query": f"author={author_2.name}"},
            {'method': "get", "path": ["post"], "query": f"author={author_2.id}"},
            {'method': "get", "path": ["post"], "query": f"author__not={author_2.id}"},
        ])

        for pos, count in enumerate((
                authors_post_count,
                author_1_post_count,
                author_1_post_count,
                author_2_post_count,
                author_2_post_count,
        )):
            self.assertEqual(results[pos]['status'], 200, results[pos]['data'])
            self.assertEqual(results[pos]['data']['count'], count)
        self.assertEqual(results[-1]['status'], 200, results[-1]['data'])
        self.assertEqual(results[-1]['data']['count'], author_1_post_count)

    def test_pagination_identifiers(self):
        author_1 = Author.objects.create(name='author_1', registerDate='2021-01-20T00:26:38Z')
        author_2 = Author.objects.create(name='author_2', registerDate='2021-01-20T00:26:38Z')
        author_3 = Author.objects.create(name='author_3', registerDate='2021-01-20T00:26:38Z')
        for author in (author_1, author_3):
            for i in range(3):
                author.post.create(title=f'post_{i}')

        expected_authors_identifiers = f"{author_1.id},{author_3.id}"
        results = self.bulk([
            {"method": "get", "path": ['author']},
            {"method": "get", "path": ['post'], "query": "__authors=<<0[headers][Pagination-Identifiers]>>"},
            {"method": "get", "path": ['author'], "headers": {"HTTP_IDENTIFIERS_LIST-NAME": "id"}, "query": f"id={expected_authors_identifiers}"},
            {"method": "get", "path": ['post'], "query": "__authors=<<2[headers][Pagination-Identifiers]>>"},
            {"method": "get", "path": ['author'], "headers": {"HTTP_IDENTIFIERS_LIST-NAME": "id"}, "query": f"id={author_2.id}"},
            {"method": "get", "path": ['post'], "query": "__authors=<<4[headers][Pagination-Identifiers]>>"},
        ])
        self.assertEqual(results[0]['status'], 200)
        self.assertTrue('Pagination-Identifiers' not in results[0]['headers'])
        self.assertEqual(results[1]['status'], 500)
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[2]['headers']['Pagination-Identifiers'], expected_authors_identifiers)
        self.assertEqual(results[3]['status'], 200, results[3])
        self.assertEqual(results[3]['data']['count'], 6)
        self.assertEqual(results[4]['status'], 200)
        self.assertEqual(results[4]['data']['count'], 1)
        self.assertEqual(results[5]['status'], 200, results[5])
        self.assertEqual(results[5]['data']['count'], 0)

    def test_model_rating_field(self):
        date = '2021-01-20T00:26:38Z'
        author = Author.objects.create(name='author_1', registerDate=date)
        post_data = {
            'author': author,
            'title': 'exm_post',
            'rating': 8.0,
            'fa_icon_rating': 0.0,
            'text': 'lorem',
            'category': None,
            'some_data': None,
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
        post_data['rating'] = 8.0
        self.assertEqual(['Ensure this value is less than or equal to 10.'], results[0]['data']['rating'])
        self.assertDictEqual(post_data, results[2]['data'])

    def test_multiplefilefield(self):
        post_data = {
            'some_multiplefile': self.multiplefile_post_data
        }
        results = self.bulk([
            {'method': 'post', 'path': ['testbinarymodelschema'], 'data': post_data},
            {'method': 'get', 'path': ['testbinarymodelschema']},
            {
                'method': 'patch',
                'path': ['testbinarymodelschema', '<<0[data][id]>>'],
                'data': {
                    'some_multiplefile': [
                        {'content': '/media/cat.jpeg', 'name': 'cat.jpeg', 'mediaType': ''},
                        {'content': '/media/same_cat.jpeg', 'name': 'same_cat.jpeg', 'mediaType': ''}
                    ]
                }
            },
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

    def test_wysiwyg_field(self):
        author = Author.objects.create(name='Some author')
        results = self.bulk([
            {
                'method': 'post',
                'path': ['post'],
                'data': {
                    'title': 'Test Post',
                    'author': author.id,
                    'some_data': 'data',
                    'text': '# Test data\n<script>alert("test")</script> <img src="http://test">',
                }},
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[0]['data']['text'], '# Test data\nalert(&quot;test&quot;) ')

    def test_phone_field(self):
        def create_author(phone):
            return {'method': 'post', 'path': 'author', 'data': {'name': 'author', 'phone': phone}}

        results = self.bulk([
            create_author('sdfdsgdfg'),
            create_author(''),
            create_author('123'),
            create_author(123),
            create_author('131232132132132131223'),
            create_author('+1234567890'),
            create_author(' 12345 67890 '),
        ])

        for invalid in results:
            self.assertEqual(invalid['status'], 400)

        results = self.bulk([
            create_author(None),
            create_author('12345678900'),
        ])

        for valid in results:
             self.assertEqual(valid['status'], 201)

        print(results)

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

    def test_dynamic_field_types(self):
        file = get_file_value(os.path.join(DIR_PATH, 'image_b64_valid'))
        valid_image_content_dict = {
            'name': 'cat.jpg',
            'content': file,
            'mediaType': 'image/jpeg'
        }
        results = self.bulk([
            # [0] Create with field_type that is not in types
            {'method': 'post', 'path': 'dynamic_fields', 'data': {
                'field_type': 'unknown',
                'dynamic_with_types': {},
            }},
            # [1] Invalid data (not integer)
            {'method': 'post', 'path': 'dynamic_fields', 'data': {
                'field_type': 'integer',
                'dynamic_with_types': {},
            }},
            # [2] Invalid data (empty dict)
            {'method': 'post', 'path': 'dynamic_fields', 'data': {
                'field_type': 'serializer',
                'dynamic_with_types': {},
            }},
            # [3] Valid data
            {'method': 'post', 'path': 'dynamic_fields', 'data': {
                'field_type': 'integer',
                'dynamic_with_types': 5,
            }},
            # [4]
            {'method': 'get', 'path': ['dynamic_fields', '<<3[data][id]>>']},
            # [5] Valid data
            {'method': 'post', 'path': 'dynamic_fields', 'data': {
                'field_type': 'serializer',
                'dynamic_with_types': {'field1': 'testValue', 'field2': -1},
            }},
            # [6]
            {'method': 'get', 'path': ['dynamic_fields', '<<5[data][id]>>']},
            # [7]
            {'method': 'post', 'path': 'dynamic_fields', 'data': {
                'field_type': 'image',
                'dynamic_with_types': valid_image_content_dict,
            }},
            # [8]
            {'method': 'get', 'path': ['dynamic_fields', '<<7[data][id]>>']},
            # [9]
            {'method': 'post', 'path': 'dynamic_fields', 'data': {
                'field_type': 'context_depend',
                'dynamic_with_types': 'lol',
            }},
        ])
        self.assertEqual(results[0]['status'], 201)

        self.assertEqual(results[1]['status'], 400)
        self.assertEqual(results[1]['data'], {'dynamic_with_types': ['A valid integer is required.']})

        self.assertEqual(results[2]['status'], 400)
        self.assertEqual(results[2]['data'], {'dynamic_with_types': {
            'field1': ['This field is required.'],
            'field2': ['This field is required.'],
        }})

        self.assertEqual(results[3]['status'], 201)
        self.assertEqual(results[3]['data']['dynamic_with_types'], 5)
        self.assertEqual(results[4]['status'], 200)
        self.assertEqual(results[4]['data']['dynamic_with_types'], 5)

        self.assertEqual(results[5]['status'], 201)
        self.assertEqual(results[5]['data']['dynamic_with_types'], {'field1': 'testValue', 'field2': -1})
        self.assertEqual(results[6]['status'], 200)
        self.assertEqual(results[7]['status'], 201)
        self.assertEqual(results[7]['data']['dynamic_with_types'], valid_image_content_dict)
        self.assertEqual(results[8]['data']['dynamic_with_types'], valid_image_content_dict)
        self.assertEqual(results[9]['status'], 201, results[9])
        self.assertEqual(results[9]['data']['dynamic_with_types'], 'lol')

        # Check if 'field' is invalid then error should not be raised
        class SomeSerializer(BaseSerializer):
            unknown_field = fields.DynamicJsonTypeField(field='unknown')
        self.assertDictEqual(SomeSerializer({'unknown_field': 'data'}).data, {'unknown_field': 'data'})

    def test_model_namedbinfile_field(self):
        file = get_file_value(os.path.join(DIR_PATH, 'image_b64_valid'))
        valid_image_content_dict = {
            'name': 'cat.jpg',
            'content': file,
            'mediaType': 'image/jpeg'
        }
        value = {'name': 'abc.png', 'content': 'c29tZSB0ZXh0IHZhbHVl', 'mediaType': 'text/txt'}
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
        self.assertEqual(
            ''.join(results[35]['data']['some_validatedmultiplenamedbinimage'][0]),
            'Invalid image size orientations'
        )

    def test_file_field(self):
        with open(os.path.join(DIR_PATH, 'cat.jpeg'), 'rb') as cat1:
            cat64 = base64.b64encode(cat1.read()).decode('utf-8')
        # convert file to json
        valid_image_content_dict = {
            'name': 'cat.jpg',
            'content': cat64,
            'mediaType': 'image/jpeg'
        }
        long_name_image_content_dict = {
            **valid_image_content_dict,
            'name': 'a' * 101 + ".jpg"
        }
        long_content_image_content_dict = {
            **valid_image_content_dict,
            'content': base64.b64encode(b'a' * 10000 + b'a').decode('utf-8')
        }
        short_content_image_content_dict = {
            **valid_image_content_dict,
            'content': base64.b64encode(b'a' * 3000 + b'a').decode('utf-8')
        }

        results = self.bulk([
            {
                'method': 'post',
                'path': ['testbinaryfiles'],
                'data': {'some_filefield': valid_image_content_dict, 'some_imagefield': valid_image_content_dict}
            },
            {
                'method': 'get',
                'path': ['testbinaryfiles', '<<0[data][id]>>']
            },
            {
                'method': 'patch',
                'path': ['testbinaryfiles', '<<0[data][id]>>'],
                'data': {
                    'some_filefield': {
                        "name": valid_image_content_dict['name'],
                        "content": "<<1[data][some_filefield][content]>>",
                        "mediaType": "",
                    }
                }
            },
            {
                'method': 'post',
                'path': ['testbinarymodelschema'],
                'data': {'some_filefield': long_name_image_content_dict, 'some_imagefield': long_name_image_content_dict}
            },
            {
                'method': 'post',
                'path': ['testbinarymodelschema'],
                'data': {'some_filefield': long_content_image_content_dict, 'some_imagefield': long_content_image_content_dict}
            },
            {
                'method': 'post',
                'path': ['testbinarymodelschema'],
                'data': {'some_filefield': short_content_image_content_dict, 'some_imagefield': short_content_image_content_dict}
            },
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 200)
        self.assertEqual(results[2]['status'], 200)
        self.assertEqual(results[3]['status'], 400)
        self.assertEqual(results[3]['data']['some_filefield'][0], 'Name of file so long. Allowed only 100 symbols.')
        self.assertEqual(results[4]['status'], 400)
        self.assertEqual(results[4]['data']['some_filefield'][0], 'The file is too large.')
        self.assertEqual(results[5]['status'], 400)
        self.assertEqual(results[5]['data']['some_imagefield'][0], 'The file is too small.')
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
            {
                'method': 'get',
                'path': ['testcontenttype', '<<1[data][id]>>', 'vars'],
            },
            {
                'method': 'post',
                'path': ['testcontenttype', '<<1[data][id]>>', 'vars'],
                'data': {
                    'key': '<<0[data][id]>>',
                    'value': ''.join(map(str, range(12))),
                }
            },
            {
                'method': 'post',
                'path': ['vartype'],
                'data': {'name': 'test_int', 'val_type': "integer"}
            },
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
            {
                'method': 'get',
                'path': ['testcontenttype', '<<1[data][id]>>', 'vars'],
                'headers': {"HTTP_IF_NONE_MATCH": '<<3[headers][ETag]>>'},
            },
            {
                'method': 'get',
                'path': ['testcontenttype', '<<1[data][id]>>', 'vars'],
                'headers': {"HTTP_IF_NONE_MATCH": '<<6[headers][ETag]>>'},
            },
            {
                'method': 'post',
                'path': ['testcontenttype', '<<1[data][id]>>', 'vars'],
                'data': {
                    'key': '<<0[data][id]>>',
                    'value': 'test_val',
                }
            },
            {
                'method': 'patch',
                'path': ['testcontenttype', '<<1[data][id]>>', 'vars', '<<10[data][id]>>'],
                'data': {
                    'key': '<<5[data][id]>>',
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
        self.assertEqual(results[8]['status'], 200, results[8])
        self.assertEqual(results[9]['status'], 304, results[9])
        self.assertEqual(results[10]['status'], 201, results[10])
        self.assertEqual(results[11]['status'], 400, results[11])
        self.assertEqual(results[11]['data'], {'value': ['A valid integer is required.']})

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
            # [8-9] Check that DeepViewFilterBackend has no effect on detail view
            {'method': 'get', 'path': ['deep_nested_model', '<<0[data][id]>>'], 'query': '__deep_parent='},
            {'method': 'post', 'path': ['deep_nested_model', '<<0[data][id]>>', 'test_action'], 'data': {}},
            # [10-11] Check that standard filters works correctly even we dont set any filter backends
            {'method': 'get', 'path': ['deep_nested_model', '<<1[data][id]>>', 'deepnested'], 'query': 'id=<<2[data][id]>>'},
            {'method': 'get', 'path': ['deep_nested_model', '<<1[data][id]>>', 'deepnested'], 'query': 'id=<<0[data][id]>>'},
        ])
        self.assertEqual(results[3]['data']['count'], 3)
        self.assertEqual(results[4]['data']['results'], [results[0]['data']])
        self.assertEqual(results[5]['data']['results'], [results[1]['data']])
        self.assertEqual(results[6]['data']['results'], [results[2]['data']])
        self.assertEqual(results[7]['data']['results'], [])
        self.assertEqual(results[8]['data'], results[0]['data'])
        self.assertEqual(results[9]['status'], 200, results[9]['data'])
        self.assertEqual(results[10]['data']['count'], 1)
        self.assertEqual(results[11]['data']['count'], 0)

    def test_m2m_fk_deep_nested(self):
        Group = self.get_model_class('test_proj.Group')
        results = self.bulk([
            {'method': 'post', 'path': 'group', 'data': {'name': '1'}},
            {'method': 'post', 'path': ['group', '<<0[data][id]>>', 'childrens'], 'data': {'name': '1.1'}},
            # [2] Query nested objects
            {'method': 'get', 'path': 'group', 'query': '__deep_parent=<<0[data][id]>>'},
            # [3] Create nested in nested
            {
                'method': 'post',
                'path': ['group', '<<1[data][id]>>', 'childrens'],
                'data': {'name': '1.1.1'}
            },
            # [4] Query nested in nested objects
            {'method': 'get', 'path': 'group', 'query': '__deep_parent=<<1[data][id]>>'},
            # [5] Query root objects
            {'method': 'get', 'path': 'group', 'query': '__deep_parent='},
        ])

        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[1]['status'], 201, results[1]['data'])
        self.assertEqual(results[2]['data']['count'], 1)
        self.assertEqual(results[3]['status'], 201, results[3]['data'])
        self.assertEqual(results[4]['status'], 200)
        self.assertEqual(results[4]['data']['count'], 1)
        self.assertEqual(results[5]['status'], 200)
        self.assertEqual(results[5]['data']['count'], 1)

        # Check if deep nested (doesn't matter if it fk or m2m) works in nested view correctly.
        deep_results = self.bulk([
            # 0 create model with nested
            {'method': 'post', 'path': 'modelwithnested', 'data': {'name': 'somegroup'}},
            # 1 Create nested group
            {'method': 'post', 'path': ['modelwithnested', '<<0[data][id]>>', 'groups'], 'data': {'name': '2'}},
            # 2 Create deep nested group (2rd deep level)
            {
                'method': 'post',
                'path': ['modelwithnested', '<<0[data][id]>>', 'groups', '<<1[data][id]>>', 'childrens'],
                'data': {'name': '2.2'}
            },
            # 3 Query deep nested
            {'method': 'get', 'path': ['modelwithnested', '<<0[data][id]>>', 'groups'],
             'query': '__deep_parent=<<1[data][id]>>'},
            # m2m
            # 4 Create nested fk group
            {'method': 'post', 'path': ['modelwithnested', '<<0[data][id]>>', 'groupswithfk'], 'data': {'name': '3'}},
            # 5 Create deep nested fk group (2nd deep level)
            {
                'method': 'post',
                'path': ['modelwithnested', '<<0[data][id]>>', 'groupswithfk', '<<4[data][id]>>', 'child'],
                'data': {'name': '3.3'}
            },
            # 6 Query deep nested fk
            {'method': 'get', 'path': ['modelwithnested', '<<0[data][id]>>', 'groupswithfk'],
             'query': '__deep_parent=<<4[data][id]>>'},

            # 7 create deeper fk (3rd deep level)
            {
                'method': 'post',
                'path': ['modelwithnested', '<<0[data][id]>>', 'groupswithfk', '<<5[data][id]>>', 'child'],
                'data': {'name': '3.3.3'}
            },
            # 8 create deeper m2m (3rd deep level)
            {
                'method': 'post',
                'path': ['modelwithnested', '<<0[data][id]>>', 'groups', '<<2[data][id]>>', 'childrens'],
                'data': {'name': '2.2.2'}
            },

            # Check if detail deep nested in nested views works correctly in any deep level
            # We should have access to lower deep nested tree elements
            # fk
            # 9 Query detail 2nd deep nested level in nested view
            {
                'method': 'get',
                'path': ['modelwithnested', '<<0[data][id]>>', 'groupswithfk', '<<4[data][id]>>', 'child',
                         '<<5[data][id]>>'],
            },
            # 10 Query 3rd deep nested as second deep child
            {
                'method': 'get',
                'path': ['modelwithnested', '<<0[data][id]>>', 'groupswithfk', '<<4[data][id]>>', 'child',
                         '<<7[data][id]>>'],
            },
            # 11 Query 3rd deep nested as nested
            {
                'method': 'get',
                'path': ['modelwithnested', '<<0[data][id]>>', 'groupswithfk', '<<7[data][id]>>'],
            },
            # m2m
            # 12 Query detail 2nd deep nested level in nested view
            {'method': 'get', 'path': ['modelwithnested', '<<0[data][id]>>', 'groups', '<<1[data][id]>>', 'childrens',
                                       '<<2[data][id]>>']},
            # 13 Query detail 3rd deep nested level in nested view
            {'method': 'get', 'path': ['modelwithnested', '<<0[data][id]>>', 'groups', '<<1[data][id]>>', 'childrens',
                                       '<<8[data][id]>>']},
            # 14 Query 3rd deep nested as first deep child
            {'method': 'get', 'path': ['modelwithnested', '<<0[data][id]>>', 'groups', '<<8[data][id]>>']},

            # Check if X-Purge-Nested header logic works correctly
            # If header == 'true' realtion and nested object should be deleted.
            # Otherwise it should be removed from nested, not deleted.
            # Header should work only with nested/deep_nested with `allow_append=True` property.

            # Nesteds and deep_nesteds with `allow_append=True`
            # [15-16] Deep: Header not equal `true` removes from nested
            {
                'method': 'delete',
                'path': ['group', '<<2[data][id]>>', 'childrens', '<<8[data][id]>>'],
                'headers': {"HTTP_X_Purge_Nested": '123'}
            },
            {
                'method': 'get',
                'path': ['group', '<<8[data][id]>>'],
            },
            # [17-18] Nested: Header not equal `true` removes from nested(even if we dont have header at all)
            {
                'method': 'delete',
                'path': ['modelwithnested', '<<0[data][id]>>', 'groups', '<<1[data][id]>>'],
            },
            {
                'method': 'get',
                'path': ['group', '<<1[data][id]>>'],
            },
            # [19-20] Deep: with correct header deletes instance
            {
                'method': 'delete',
                'path': ['groupwithfk', '<<5[data][id]>>', 'child', '<<7[data][id]>>'],
                'headers': {"HTTP_X_Purge_Nested": 'true'}
            },
            {
                'method': 'get',
                'path': ['groupwithfk', '<<7[data][id]>>'],
            },
            # [21-23] Nested: with correct header deletes instance
            {'method': 'post', 'path': ['modelwithnested', '<<0[data][id]>>', 'groups'], 'data': {'name': '4'}},
            {
                'method': 'delete',
                'path': ['modelwithnested', '<<0[data][id]>>', 'groups', '<<21[data][id]>>'],
                'headers': {"HTTP_X_Purge_Nested": 'true'}
            },
            {
                'method': 'get',
                'path': ['group', '<<21[data][id]>>'],
            },
            # Nested and deep_nested with `allow_append=False`
            # [24-26] Nested: without header deletes instance
            {'method': 'post', 'path': ['modelwithnested', '<<0[data][id]>>', 'groupswithfk'], 'data': {'name': '5'}},
            {
                'method': 'delete',
                'path': ['modelwithnested', '<<0[data][id]>>', 'groupswithfk', '<<24[data][id]>>'],
            },
            {
                'method': 'get',
                'path': ['groupwithfk', '<<24[data][id]>>'],
            },
            # [27-30] Deep: without header deletes instance
            {'method': 'post', 'path': ['anotherdeep'], 'data': {'name': '6'}},
            {'method': 'post', 'path': ['anotherdeep', '<<27[data][id]>>', 'child'], 'data': {'name': '6.6'}},
            {
                'method': 'delete',
                'path': ['anotherdeep', '<<27[data][id]>>', 'child', '<<28[data][id]>>'],
            },
            {
                'method': 'get',
                'path': ['anotherdeep', '<<28[data][id]>>'],
            },
        ])
        self.assertEqual(deep_results[1]['status'], 201, deep_results[1]['data'])
        self.assertEqual(deep_results[2]['status'], 201, deep_results[2]['data'])
        self.assertEqual(deep_results[3]['status'], 200)
        self.assertEqual(deep_results[3]['data']['count'], 1)

        self.assertEqual(deep_results[4]['status'], 201, deep_results[4]['data'])
        self.assertEqual(deep_results[5]['status'], 201, deep_results[5]['data'])
        self.assertEqual(deep_results[6]['status'], 200)
        self.assertEqual(deep_results[6]['data']['count'], 1)

        self.assertIn('3.3', str(deep_results[9]['data']))
        self.assertNotIn('3.3.3', str(deep_results[9]['data']))
        self.assertIn('3.3.3', str(deep_results[10]['data']))
        self.assertIn('3.3.3', str(deep_results[11]['data']))
        self.assertIn('2.2', str(deep_results[12]['data']))
        self.assertNotIn('2.2.2', str(deep_results[12]['data']))
        self.assertIn('2.2.2', str(deep_results[13]['data']))
        self.assertIn('2.2.2', str(deep_results[14]['data']))

        # Nested header tests
        self.assertEqual(deep_results[15]['status'], 204)
        self.assertEqual(deep_results[16]['status'], 200)

        self.assertEqual(deep_results[17]['status'], 204)
        self.assertEqual(deep_results[18]['status'], 200)

        self.assertEqual(deep_results[19]['status'], 204)
        self.assertEqual(deep_results[20]['status'], 404)

        self.assertEqual(deep_results[21]['status'], 201)
        self.assertEqual(deep_results[22]['status'], 204)
        self.assertEqual(deep_results[23]['status'], 404)

        self.assertEqual(deep_results[24]['status'], 201)
        self.assertEqual(deep_results[25]['status'], 204)
        self.assertEqual(deep_results[26]['status'], 404)

        self.assertEqual(deep_results[27]['status'], 201)
        self.assertEqual(deep_results[28]['status'], 201)
        self.assertEqual(deep_results[29]['status'], 204)
        self.assertEqual(deep_results[30]['status'], 404)

    def test_purge_delete(self):
        model_with_nested_1 = ModelWithNestedModels.objects.create(name='test instance 1')
        model_with_nested_2 = ModelWithNestedModels.objects.create(name='test instance 2')

        protected = ProtectedBySignal.objects.create(name='protected')

        model_with_nested_1.protected.add(protected)
        model_with_nested_2.protected.add(protected)

        results = self.bulk([
            # [0] protected instance is used on model_with_nested_2 so this request will fail
            {
                'method': 'delete',
                'path': ['modelwithnested', model_with_nested_1.id, 'protected', protected.id],
                'headers': {'HTTP_X_Purge_Nested': 'true'}
            },
            # [1] remove protected instance from model_with_nested_2
            {
                'method': 'delete',
                'path': ['modelwithnested', model_with_nested_2.id, 'protected', protected.id],
            },
            # [2] this action will remove rotected instance from model_with_nested_1 and then remove protected instance itself
            {
                'method': 'delete',
                'path': ['modelwithnested', model_with_nested_1.id, 'protected', protected.id],
                'headers': {'HTTP_X_Purge_Nested': 'true'}
            },
        ])
        self.assertEqual(results[0]['status'], 400)
        self.assertEqual(results[1]['status'], 204)
        self.assertEqual(results[2]['status'], 204)

    def test_csv_field_data(self):
        author = Author.objects.create(name='author_1')
        results = self.bulk([
            {
                'method': 'post',
                'path': ['post'],
                'data': {
                    'title': "title",
                    'text': 'txt',
                    'some_data': 'some data some data',
                    'author': author.id
                }
            },
        ])
        self.assertEqual(results[0]['status'], 201)
        self.assertEqual(results[0]['data']['some_data'], 'some data some data')


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

        list_qs = List.objects.setup_custom_queryset_kwargs(data_source=[])
        self.assertEqual(list_qs.count(), 0)

        self.assertEqual(File.objects.filter(name__icontains='ToExclude').count(), 3)
        self.assertEqual(File.objects.filter(name__contains='oExcl').count(), 2)

    def test_custom_model_values_and_only(self):
        list_qs = List.objects.setup_custom_queryset_kwargs(data_source=[{'value': f'{i}'} for i in range(100)])
        self.assertEqual(list_qs.count(), 100)
        self.assertEqual(list_qs.values('value').first(), {'value': "0"})
        self.assertEqual(list_qs.only('value').first().value, "0")

        lf_qs = ListOfFiles.objects.all()
        first = lf_qs.defer('updated', 'value').first()
        self.assertEqual(first.id, 0)
        self.assertEqual(first.test, '1')
        self.assertEqual(first.value, '')
        self.assertEqual(lf_qs.first().value, 'File data')

    def test_custom(self):
        self.client.logout()
        results = self.bulk([
            dict(method='get', path='files'),
            dict(method='get', path=['files', 1]),
            dict(method='get', path='files', query='name=ToFilter'),
            dict(method='get', path='listoffiles'),
        ], relogin=False)

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

    def test_query_serialized_data(self):
        results = self.bulk([
            dict(method='get', path='files/query_serializer_test'),
            dict(method='get', path='files/query_serializer_test', query='test_value='),
            dict(method='get', path='files/query_serializer_test', query='test_value=TEST'),
            dict(method='get', path='files/query_serializer_test_list', query='limit=1'),
            dict(method='get', path='files/query_serializer_test', query='test_value=TEST1&another_param=NoFail'),
        ])

        self.assertEqual(results[0]['status'], 400)
        self.assertEqual(results[0]['data']['test_value'], ['This field is required.'])
        self.assertEqual(results[1]['status'], 400)
        self.assertEqual(results[1]['data']['test_value'], ['"" is not a valid choice.'])
        self.assertEqual(results[2]['status'], 400)
        self.assertEqual(results[2]['data']['test_value'], ['"TEST" is not a valid choice.'])
        self.assertEqual(results[3]['status'], 200)
        self.assertIn('results', results[3]['data'])
        self.assertCount(results[3]['data']['results'], 1)

        self.assertEqual(results[-1]['status'], 200, results[-1]['data'])
        self.assertEqual(results[-1]['data']['test_value'], 'TEST1')
        self.assertEqual(results[-1]['headers']['X-Query-Data'], 'test_value=TEST1')

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

    def test_metrics_page(self):
        result = self.get_result('get', '/api/metrics/')
        expected = (pathlib.Path(DIR_PATH)/'metrics.txt').read_text('utf-8')
        expected = expected.replace(
            '$VERSION',
            f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}'
        )
        self.assertEqual(result, expected)

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
        self.assertEqual(
            settings.SWAGGER_API_DESCRIPTION,
            '\nVery long description\nwith new lines\nfor check configs.\n'
        )
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
            'loglevel': os.environ.get('DJANGO_LOG_LEVEL', 'WARNING'),
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

    def test_notifications(self):
        from test_proj.test_notificator import messages_log

        messages_log.clear()

        Host = self.get_model_class('test_proj.models.Host')
        ModelWithUuid = self.get_model_class('test_proj.models.ModelWithUuid')

        host_obj = Host.objects.create(name="centrifuga")
        host_obj2 = Host.objects.create(name="centrifuga2")
        mwu = ModelWithUuid.objects.create(data='123')

        # 0
        notify_clients(Host, {'pk': host_obj.id})
        # 1
        bulk_notify_clients((
            (f'{Host._meta.label}', {'pk': host_obj.id}),
        ))
        # 2
        bulk_notify_clients((
            (f'{Host._meta.label}', {'pk': host_obj.id}),
            (f'{Host._meta.label}', {'pk': host_obj.id}),
        ), 'some-channel')

        # 3
        notify_clients(ModelWithUuid, {'pk': mwu.id, 'some-data': mwu.data})

        # 4
        results = self.bulk([
            {"method": "get", "path": ['subhosts', host_obj.id]},
            {"method": "delete", "path": ['subhosts', host_obj.id]},
            {"method": "delete", "path": ['subhosts', host_obj2.id]},
        ])
        for result in results:
            self.assertIn(result['status'], {200, 201, 204})

        from .tasks import CreateHostTask
        # 5
        CreateHostTask.do(name='centrifugafromtask')

        # notify
        self.assertEqual(len(messages_log[0]), 1, messages_log[0])
        self.assertEqual(messages_log[0][0]['method'], 'publish')
        self.assertDictEqual(messages_log[0][0]['params'], {
            **messages_log[0][0]['params'],
            'channel': f'{settings.VST_PROJECT}.update.test_proj.Host',
            'data': {'pk': host_obj.id},
        })

        # bulk notify
        self.assertEqual(len(messages_log[1]), 1, messages_log[1])
        self.assertEqual(messages_log[1][0]['method'], 'publish')
        self.assertDictEqual(messages_log[1][0]['params'], {
            **messages_log[1][0]['params'],
            'channel': f'{settings.VST_PROJECT}.update.test_proj.Host',
            'data': {'pk': host_obj.id},
        })

        # bulk notify with channel provided
        self.assertEqual(len(messages_log[2]), 2, messages_log[2])
        for msg in messages_log[2]:
            self.assertEqual(msg['method'], 'publish')
            self.assertDictEqual(msg['params'], {
                **msg['params'],
                'channel': 'test_proj.update.some-channel',
                'data': {'pk': host_obj.id},
            })

        # notify for uuid model
        self.assertEqual(len(messages_log[3]), 1, messages_log[3])
        self.assertEqual(messages_log[3][0]['method'], 'publish')
        self.assertDictEqual(messages_log[3][0]['params'], {
            **messages_log[3][0]['params'],
            'channel': f'{settings.VST_PROJECT}.update.test_proj.ModelWithUuid',
            'data': {'pk': str(mwu.id), 'some-data': mwu.data},
        })

        # api call
        self.assertEqual(len(messages_log[4]), 2, messages_log[4])
        self.assertEqual(messages_log[4][0]['method'], 'publish')
        self.assertDictEqual(messages_log[4][0]['params'], {
            **messages_log[4][0]['params'],
            'channel': f'{settings.VST_PROJECT}.update.test_proj.Host',
            'data': {'pk': host_obj.id},
        })
        self.assertEqual(messages_log[4][1]['method'], 'publish')
        self.assertDictEqual(messages_log[4][1]['params'], {
            **messages_log[4][1]['params'],
            'channel': f'{settings.VST_PROJECT}.update.test_proj.Host',
            'data': {'pk': host_obj2.id},
        })

        # celery
        self.assertEqual(len(messages_log[5]), 1, messages_log[5])
        self.assertEqual(messages_log[5][0]['method'], 'publish')
        self.assertDictEqual(messages_log[5][0]['params'], {
            **messages_log[5][0]['params'],
            'channel': f'{settings.VST_PROJECT}.update.test_proj.Host',
        })


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
        self.assertEqual(201, results[1]['status'], results[1]['data'])
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


class TasksTestCase(BaseTestCase):
    def test_task_class_executor(self):
        call_command(
            'run_task',
            '--sync',
            interactive=0,
            kwargs=json.dumps({'name': "test host obj"}),
            task='test_proj.tasks.CreateHostTask'
        )
        self.assertEqual(Host.objects.order_by('-id').first().name, 'test host obj')

        invalid_host_task = 'test host obj 2'
        # Try to load a non-existent task
        with self.assertRaises(SystemExit):
            call_command(
                'run_task',
                '--sync',
                interactive=0,
                kwargs=json.dumps({'name': invalid_host_task}),
                task='test_proj.tasks.NonExistTask'
            )
        with self.assertRaises(SystemExit):
            call_command(
                'run_task',
                '--sync',
                interactive=0,
                kwargs='{invalid json}',
                task='test_proj.tasks.CreateHostTask'
            )
        self.assertEqual(Host.objects.order_by('-id').first().name, 'test host obj')
        self.assertFalse(Host.objects.filter(name=invalid_host_task).exists())

    def test_uniq_task_decorator(self):
        from celery.exceptions import Reject
        from .tasks import (
            CreateHostTask,
            InheritCreateHostTask,
            Inherit2CreateHostTask,
            InheritNonUniqCreateHostTask,
        )

        CreateHostTask.do(name='testlock')
        CreateHostTask.do(name='testlock2')
        InheritCreateHostTask.do(name='testlock3')

        with utils.Lock(f'uniq-celery-task-{CreateHostTask().name}'):
            with self.assertRaises(Reject):
                CreateHostTask.do(name='testlock')

        with utils.Lock(f'uniq-celery-task-{InheritCreateHostTask().name}'):
            with self.assertRaises(Reject):
                InheritCreateHostTask.do(name='testlock')

        with utils.Lock(f'uniq-celery-task-{Inherit2CreateHostTask().name}'):
            with self.assertRaises(Reject):
                Inherit2CreateHostTask.do(name='testlock')

        with utils.Lock(f'uniq-celery-task-{InheritNonUniqCreateHostTask().name}'):
            InheritNonUniqCreateHostTask.do(name='testlock123')
