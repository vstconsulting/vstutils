from typing import Dict

from django.urls import reverse
from django.conf import settings
from django.http.request import HttpRequest
from django.utils.functional import lazy
from django.utils.module_loading import import_string

from ..utils import raise_context_decorator_with_default


manifest_object = import_string(settings.MANIFEST_CLASS)()
project_lib_version = getattr(settings, 'PROJECT_LIB_VERSION', '')
project_version = getattr(settings, 'PROJECT_VERSION', '')
vstutils_version = settings.VSTUTILS_VERSION
gui_version = "_".join(map(str, [project_version, project_lib_version, vstutils_version]))
static_path = getattr(settings, 'STATIC_URL', '/static/')
debug_enabled = getattr(settings, 'DEBUG', False)
ignore_errors_decorator = raise_context_decorator_with_default(default={})


def lazy_decorator(func):
    return lazy(ignore_errors_decorator(func), dict)


@lazy_decorator
def settings_constants(request: HttpRequest) -> Dict:
    # pylint: disable=unused-argument
    return {
        "docs_url": settings.DOC_URL if getattr(settings, 'HAS_DOCS', False) else '',
        "has_docs": getattr(settings, 'HAS_DOCS', False),
        "timezone": getattr(settings, 'TIME_ZONE', 'UTC'),
        "debug": debug_enabled,
        "languages": settings.LANGUAGES,
        "name": '',
    }


@lazy_decorator
def project_args(request: HttpRequest) -> Dict:
    host_url = request.build_absolute_uri('/')[:-1]
    ver_key = f'{getattr(settings, "VST_PROJECT", "vstutils")}_version'
    api_url = f'{host_url}{reverse("api-root")}'
    return {
        "host_url": host_url,
        "gui_version": gui_version,
        "gui_named_version": f'{settings.VST_PROJECT}_{gui_version}',
        "vstutils_version": settings.VSTUTILS_VERSION,
        "project_lib_version": project_lib_version,
        "project_version": project_version,
        ver_key: project_version,
        "project_gui_name": getattr(settings, 'PROJECT_GUI_NAME', None),
        "project_menu": getattr(settings, 'PROJECT_GUI_MENU', []),
        "openapi_url": reverse('endpoint'),
        "endpoint_path": reverse('endpoint'),
        "api_version": settings.VST_API_VERSION,
        "api_url": f'{api_url}/{settings.VST_API_VERSION}',
        "enable_gravatar": settings.ENABLE_GRAVATAR,
    }


@lazy_decorator
def pwa_context(request: HttpRequest) -> Dict:
    return {
        "manifest_object": manifest_object,
        "block_timeout": 86400 if not debug_enabled else 0,
    }


@lazy_decorator
def headers_context(request: HttpRequest) -> Dict:
    result = dict(request.META)
    result['HTTP_X_APP'] = result.get('HTTP_X_APP', 'browser')
    return {'metadata': result}
