# pylint: disable=import-error
from collections import OrderedDict

import django
from django.conf import settings
from rest_framework import __version__ as drf_version
from fastapi import __version__ as fastapi_version
from drf_yasg import openapi, __version__ as drf_yasg_version  # type: ignore
try:
    import celery
except ImportError:  # nocv
    celery = None

from ... import __version__ as vstutils_version


x_versions = OrderedDict()  # type: OrderedDict
x_versions['application'] = settings.PROJECT_VERSION
x_versions['library'] = settings.PROJECT_LIB_VERSION
x_versions['vstutils'] = vstutils_version
x_versions['django'] = django.__version__
x_versions['djangorestframework'] = drf_version
x_versions['drf_yasg'] = drf_yasg_version
x_versions['fastapi'] = fastapi_version

if celery is not None:
    x_versions['celery'] = celery.__version__  # type: ignore

api_info_dict = OrderedDict(
    title=settings.PROJECT_GUI_NAME,
    default_version=settings.VST_API_VERSION,
    description=settings.SWAGGER_API_DESCRIPTION,
    terms_of_service=settings.TERMS_URL,
    contact=openapi.Contact(**settings.CONTACT),
    **{
        'x-versions': x_versions,
        'x-links': settings.OPENAPI_EXTRA_LINKS,
        'x-menu': settings.PROJECT_GUI_MENU,
        'x-docs': OrderedDict(
            has_docs=settings.HAS_DOCS,
            docs_url=getattr(settings, 'DOC_URL', '/docs/'),
        ),
        'x-settings': OrderedDict(
            static_path=settings.STATIC_URL,
            enable_gravatar=settings.ENABLE_GRAVATAR,
            time_zone=settings.TIME_ZONE,
        ),
        'x-page-limit': settings.PAGE_LIMIT,
        'x-subscriptions-prefix': settings.SUBSCRIPTIONS_PREFIX
    }
)

if settings.GRAVATAR_URL:
    api_info_dict['x-settings']['gravatar_url'] = settings.GRAVATAR_URL

if settings.WEBPUSH_ENABLED:
    api_info_dict['x-webpush'] = {
        'public_key': settings.WEBPUSH_PUBLIC_KEY,
        'user_settings_subpath': (
            settings.WEBPUSH_USER_SETTINGS_VIEW_SUBPATH
            if settings.WEBPUSH_CREATE_USER_SETTINGS_VIEW
            else None
        ),
    }

api_info = openapi.Info(**api_info_dict)
