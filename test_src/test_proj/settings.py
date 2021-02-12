# [test_settings]
from vstutils.settings import *

INSTALLED_APPS += [
    'test_proj',
]

MIDDLEWARE.append('vstutils.middleware.TimezoneHeadersMiddleware')

API['v2'] = {}
API['v3'] = {}
API['v4'] = {}
API[VST_API_VERSION][r'author'] = dict(
    model='test_proj.models.Author'
)
API[VST_API_VERSION][r'list'] = dict(
    model='test_proj.models.List'
)
API[VST_API_VERSION][r'settings'] = dict(
    view='vstutils.api.views.SettingsViewSet',
    op_types=['get', 'mod'],
    name='settings'
)
API[VST_API_VERSION][r'hosts'] = dict(
    view='test_proj.views.HostGroupViewSet'
)
API[VST_API_VERSION][r'hosts_list'] = dict(
    model='test_proj.models.HostList'
)
API[VST_API_VERSION][r'deephosts'] = dict(
    view='test_proj.views.DeepHostGroupViewSet'
)
# ![test_settings]

API[VST_API_VERSION][r'subhosts'] = dict(
    view='test_proj.views.HostViewSet'
)
API[VST_API_VERSION][r'files'] = dict(
    model='test_proj.models.File'
)
API[VST_API_VERSION][r'testfk'] = dict(
    model='test_proj.models.ModelWithFK'
)
API[VST_API_VERSION][r'testbinaryfiles'] = dict(
    view='test_proj.views.TestBinaryFilesViewSet'
)
API[VST_API_VERSION][r'testcontenttype'] = dict(
    model='test_proj.models.VarBasedModel'
)
API[VST_API_VERSION][r'vartype'] = dict(
    model='test_proj.models.VariableType'
)
API['v2'][r'testbinaryfiles2'] = dict(
    view='test_proj.views.TestBinaryFilesViewSet'
)
API['v2'][r'request_info'] = dict(
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
API['v4'][r'user'] = dict(
    view='test_proj.views.TestUserViewSet'
)

GUI_VIEWS[r'^gui/$'] = r'^$'
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
GUI_VIEWS[r'^registration/$'] = VIEWS['USER_REGISTRATION']

DEBUG = True
PWA_MANIFEST = {
    'display': 'fullscreen'
}

LANGUAGES += (('uk', 'Empty list'),)

KWARGS['ENV'].setdefault('VSTUTILS_TEST_ENV', 123)
TEST_VAR_FROM_ENV = main.get('DO_NOT_USE_IT_IN_CONFIG', "{ENV[HOME:-default]}")
TEST_VAR_FROM_ENV_DEFAULT = main.get('DO_NOT_USE_IT_IN_CONFIG', "{ENV[DO_NOT_USE_IT_IN_CONFIG:-default]}")
TEST_VAR_FROM_ENV2 = main.get('DO_NOT_USE_IT_IN_CONFIG', "{ENV[VSTUTILS_TEST_ENV]}")
