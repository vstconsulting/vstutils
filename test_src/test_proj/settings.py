from vstutils.settings import *

DEBUG = True

INSTALLED_APPS += [
    'test_proj',
]

API[VST_API_VERSION][r'hosts'] = dict(
    view='test_proj.views.HostGroupViewSet'
)

