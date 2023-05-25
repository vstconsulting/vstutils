from typing import Dict

from django.urls import reverse
from django.conf import settings
from django.http.request import HttpRequest
from django.utils.functional import lazy, SimpleLazyObject

from ..utils import import_class, raise_context_decorator_with_default
from ..static_files import SPA_STATIC_FILES_PROVIDERS


manifest_object = import_class(settings.MANIFEST_CLASS)()
project_lib_version = getattr(settings, 'PROJECT_LIB_VERSION', '')
project_version = getattr(settings, 'PROJECT_VERSION', '')
vstutils_version = settings.VSTUTILS_VERSION
gui_version = "_".join(map(str, [project_version, project_lib_version, vstutils_version]))
static_path = getattr(settings, 'STATIC_URL', '/static/')
static_list = SPA_STATIC_FILES_PROVIDERS.get_sorted_list()
debug_enabled = getattr(settings, 'DEBUG', False)
ignore_errors_decorator = raise_context_decorator_with_default(default={})


def lazy_decorator(func):
    return lazy(ignore_errors_decorator(func), dict)


def lazy_value(func):
    return SimpleLazyObject(func)


def static_file_set_version_to_name(files_list_object: dict):
    new_object = files_list_object.copy()
    version_source = new_object.get('source', 'gui') or 'gui'
    new_object['version'] = globals().get(version_source + '_version', gui_version)
    return new_object


@lazy_decorator
def settings_constants(request: HttpRequest) -> Dict:
    # pylint: disable=unused-argument
    return {
        "login_url": reverse('login'),
        "logout_url": reverse('logout'),
        "docs_url": settings.DOC_URL if getattr(settings, 'HAS_DOCS', False) else '',
        "has_docs": getattr(settings, 'HAS_DOCS', False),
        "timezone": getattr(settings, 'TIME_ZONE', 'UTC'),
        "debug": debug_enabled,
        "languages": settings.LANGUAGES,
    }


@lazy_decorator
def project_args(request: HttpRequest) -> Dict:
    host_url = request.build_absolute_uri('/')[:-1]
    ver_key = f'{getattr(settings, "VST_PROJECT", "vstutils")}_version'
    request_gui_version = f'{gui_version}_{str(request.user.id or 0)}'
    return {
        "host_url": host_url,
        "gui_version": gui_version,
        "gui_named_version": f'{settings.VST_PROJECT}_{gui_version}',
        "gui_user_version": request_gui_version,
        "vstutils_version": settings.VSTUTILS_VERSION,
        "project_lib_version": project_lib_version,
        "project_version": project_version,
        ver_key: project_version,
        "project_gui_name": getattr(settings, 'PROJECT_GUI_NAME', None),
        "project_menu": getattr(settings, 'PROJECT_GUI_MENU', []),
        "openapi_url": reverse('endpoint'),
        "endpoint_path": reverse('endpoint'),
        "api_version": settings.VST_API_VERSION,
        "api_url": f'{host_url}{reverse("api-root")}{settings.VST_API_VERSION}/',
        "enable_gravatar": settings.ENABLE_GRAVATAR,
        "registration_enabled": settings.REGISTRATION_ENABLED,
    }


@lazy_decorator
def pwa_context(request: HttpRequest) -> Dict:
    return {
        "manifest_object": manifest_object,
        "static_files_list": lazy_value(
            lambda: tuple(map(
                static_file_set_version_to_name,
                static_list
            ))
        ),
        "block_timeout": 86400 if not debug_enabled else 0,
    }


@lazy_decorator
def headers_context(request: HttpRequest) -> Dict:
    result = dict(request.META)
    result['HTTP_X_APP'] = result.get('HTTP_X_APP', 'browser')
    return {'metadata': result}
