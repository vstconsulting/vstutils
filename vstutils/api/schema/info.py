# pylint: disable=import-error
from collections import OrderedDict

import django
from django.conf import settings
from django.urls import reverse_lazy
from rest_framework import __version__ as drf_version  # type: ignore
from drf_yasg import openapi, __version__ as drf_yasg_version  # type: ignore

from ... import __version__ as vstutils_version


x_versions = OrderedDict()  # type: OrderedDict
x_versions['application'] = settings.PROJECT_VERSION
x_versions['library'] = settings.PROJECT_LIB_VERSION
x_versions['vstutils'] = vstutils_version
x_versions['django'] = django.__version__
x_versions['djangorestframework'] = drf_version
x_versions['drf_yasg'] = drf_yasg_version

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
            has_docs='docs' in settings.INSTALLED_APPS,
            docs_url=getattr(settings, 'DOC_URL', '/docs/'),
        ),
        'x-settings': OrderedDict(
            static_path=settings.STATIC_URL,
            enable_gravatar=settings.ENABLE_GRAVATAR,
            time_zone=settings.TIME_ZONE,
            logout_url=reverse_lazy('logout'),
            login_url=reverse_lazy('login'),
        ),
        'x-page-limit': settings.PAGE_LIMIT,
        'x-subscriptions-prefix': settings.SUBSCRIPTIONS_PREFIX
    }
)

api_info = openapi.Info(**api_info_dict)
