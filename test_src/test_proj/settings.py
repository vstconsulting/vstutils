# [test_settings]
from vstutils.settings import *

INSTALLED_APPS += [
    'test_proj',
]

MIDDLEWARE.append('vstutils.middleware.TimezoneHeadersMiddleware')
MIDDLEWARE.insert(0, 'django.middleware.gzip.GZipMiddleware')

HEALTH_BACKEND_CLASS = 'test_proj.health.TestDefaultBackend'

API['v2'] = {}
API['v3'] = {}
API['v4'] = {}

API[VST_API_VERSION][r'test_json_file_image_fields_model'] = dict(
    model='test_proj.models.ModelForCheckFileAndImageField'
)
API[VST_API_VERSION][r'uuid_as_pk'] = dict(
    model='test_proj.models.ModelWithUuidPk'
)
API[VST_API_VERSION][r'uuid_as_fk'] = dict(
    model='test_proj.models.ModelWithUuidFK'
)
API[VST_API_VERSION][r'deep_nested_model'] = dict(
    model='test_proj.models.DeepNestedModel'
)
API[VST_API_VERSION][r'readonly_deep_nested_model'] = dict(
    model='test_proj.models.ReadonlyDeepNestedModel'
)
API[VST_API_VERSION][r'somethingwithimage'] = dict(
    model='test_proj.models.SomethingWithImage'
)
API[VST_API_VERSION][r'author'] = dict(
    model='test_proj.models.Author'
)
API[VST_API_VERSION][r'post'] = dict(
    model='test_proj.models.Post'
)
API[VST_API_VERSION][r'list'] = dict(
    model='test_proj.models.List'
)
API[VST_API_VERSION][r'listoffiles'] = dict(
    model='test_proj.models.ListOfFiles'
)
API[VST_API_VERSION][r'settings'] = dict(
    view='vstutils.api.views.SettingsViewSet',
    op_types=['get', 'mod'],
    name='settings'
)
API[VST_API_VERSION][r'hosts_without_auth'] = dict(
    view='test_proj.views.HostWithoutAuthViewSet'
)
API[VST_API_VERSION][r'hosts'] = dict(
    view='test_proj.views.HostGroupViewSet'
)
API[VST_API_VERSION][r'hosts_list'] = dict(
    view='test_proj.views.HostListViewSet'
)
API[VST_API_VERSION][r'deephosts'] = dict(
    view='test_proj.views.DeepHostGroupViewSet'
)
API[VST_API_VERSION][r'group'] = dict(
    model='test_proj.models.Group'
)
API[VST_API_VERSION][r'modelwithnested'] = dict(
    model='test_proj.models.ModelWithNestedModels'
)
API[VST_API_VERSION][r'modelwithcrontab'] = dict(
    model='test_proj.models.ModelWithCrontabField'
)
API[VST_API_VERSION][r'groupwithfk'] = dict(
    model='test_proj.models.GroupWithFK'
)
API[VST_API_VERSION][r'anotherdeep'] = dict(
    model='test_proj.models.AnotherDeepNested'
)
# ![test_settings]

API[VST_API_VERSION][r'subhosts'] = dict(
    view='test_proj.views.HostViewSet'
)
API[VST_API_VERSION][r'files'] = dict(
    model='test_proj.models.File'
)
API[VST_API_VERSION][r'testfk'] = dict(
    view='test_proj.views.ModelWithFKViewSet'
)
API[VST_API_VERSION][r'testbinaryfiles'] = dict(
    view='test_proj.views.TestBinaryFilesViewSet'
)
API[VST_API_VERSION][r'testbinarymodelschema'] = dict(
    model='test_proj.models.OverridenModelWithBinaryFiles'
)
API[VST_API_VERSION][r'testcontenttype'] = dict(
    model='test_proj.models.VarBasedModel'
)
API[VST_API_VERSION][r'vartype'] = dict(
    model='test_proj.models.VariableType'
)
API[VST_API_VERSION][r'cachable'] = dict(
    model='test_proj.models.CachableProxyModel'
)
API[VST_API_VERSION][r'dynamic_fields'] = dict(
    model='test_proj.models.dynamic_fields.DynamicFields'
)
API['v2']['testbinaryfiles2'] = dict(
    view='test_proj.views.TestBinaryFilesViewSet'
)
API['v2']['request_info'] = dict(
    view='test_proj.views.RequestInfoTestView'
)
API['v2'][r'settings'] = dict(
    view='test_proj.views.SettingsViewSetV2',
    op_types=['get', 'mod'],
    name='settings'
)
API['v3'][r'testbinaryfiles'] = dict(
    view='test_proj.views.TestBinaryFilesViewSet'
)
API['v4']['user'] = dict(
    view='test_proj.views.TestUserViewSet'
)

API[VST_API_VERSION][r'test_changed_fk'] = dict(
    model='test_proj.models.ModelWithChangedFk'
)

GUI_VIEWS[r'^gui/$'] = ''
GUI_VIEWS[r'^csrf_disable_gui/$'] = {
    'BACKEND': 'vstutils.gui.views.GUIView',
    'CSRF_ENABLE': False
}
GUI_VIEWS[r'^suburls/'] = {
    'BACKEND': 'test_proj.suburls.urlpatterns'
}
GUI_VIEWS[r'^suburls_namespaced/'] = {
    'BACKEND': 'test_proj.suburls.urlpatterns',
    'OPTIONS': {
        'view_kwargs': {
            'namespace': 'suburls_namespaced'
        }
    }
}
GUI_VIEWS[r'^suburls_module/'] = {
    'BACKEND': 'test_proj.suburls'
}

DEBUG = True
PWA_MANIFEST = {
    'display': 'fullscreen'
}

LANGUAGES += (('uk', 'Empty list'),)

KWARGS['ENV'].setdefault('VSTUTILS_TEST_ENV', 123)
TEST_VAR_FROM_ENV = main.get('DO_NOT_USE_IT_IN_CONFIG', "{ENV[HOME:-default]}")
TEST_VAR_FROM_ENV_DEFAULT = main.get('DO_NOT_USE_IT_IN_CONFIG', "{ENV[DO_NOT_USE_IT_IN_CONFIG:-default]}")
TEST_VAR_FROM_ENV2 = main.get('DO_NOT_USE_IT_IN_CONFIG', "{ENV[VSTUTILS_TEST_ENV]}")

DATABASE_ROUTERS = ['test_proj.db_router.TestDbRouter']
DOCKER_DATABASES_TO_MIGRATE = ('primary1',)
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

