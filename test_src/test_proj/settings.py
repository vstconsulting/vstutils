# [test_settings]
from vstutils.settings import *

INSTALLED_APPS += [
    'test_proj',
]

API[VST_API_VERSION][r'hosts'] = dict(
    view='test_proj.views.HostGroupViewSet'
)
API[VST_API_VERSION][r'deephosts'] = dict(
    view='test_proj.views.DeepHostGroupViewSet'
)
# ![test_settings]

API[VST_API_VERSION][r'subhosts'] = dict(
    view='test_proj.views.HostViewSet'
)

API[VST_API_VERSION][r'files'] = dict(
    view='test_proj.views.FilesViewSet'
)

GUI_VIEWS[r'^gui/$'] = r'^$'
GUI_VIEWS[r'^csrf_disable_gui/$'] = {
    'BACKEND': 'vstutils.gui.views.GUIView',
    'CSRF_ENABLE': False
}
GUI_VIEWS[r'^suburls/'] = {
    'BACKEND': 'test_proj.suburls.urlpatterns'
}

DEBUG = True
