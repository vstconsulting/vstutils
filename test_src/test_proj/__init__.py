"""
Very long description
with new lines
for check configs.
"""

import os
import sys
from vstutils.environment import prepare_environment, cmd_execution

__version__ = '1.0.0'

settings = {
    "VST_PROJECT": 'test_proj',
    "VST_ROOT_URLCONF": 'vstutils.urls',
    "VST_WSGI": 'vstutils.wsgi',
    "VST_PROJECT_GUI_NAME": "Example Project",
    "DJANGO_SETTINGS_MODULE": 'test_proj.settings',
    "TEST_PROJ_UWSGI_HARAKIRI": "120",
    "TEST_PROJ_UWSGI_VACUUM": "true",
    "VST_DEV_SETTINGS": os.path.join(os.path.dirname(__file__), 'test_settings.ini'),
}

prepare_environment(**settings)
