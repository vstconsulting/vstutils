# pylint: disable=invalid-name
import os
import re
import functools

from django.conf import settings
from django.urls.conf import include, re_path, path
from django.contrib import admin
from django.views.static import serve
from django.contrib.staticfiles.views import serve as serve_static
from django.views.generic.base import RedirectView
from rest_framework import permissions

from .api.routers import MainRouter
from .utils import URLHandlers
from .api.views import HealthView, MetricsView

static_serve = functools.partial(serve_static, insecure=True)
gui_enabled = not getattr(settings, 'API_ONLY', False)


def get_valid_url(*args):
    return os.path.join('/', *(x.lstrip('^/') for x in filter(bool, args + ('/',))))


class AdminLoginLogoutRedirectView(RedirectView):
    query_string = True


# Main router for all APIs versions
router = MainRouter(perms=(permissions.IsAuthenticated,))
router.generate_routers(settings.API)
router.register_view('health', HealthView.as_view({'get': 'list'}), 'health')
if settings.ENABLE_METRICS_VIEW:
    router.register_view('metrics', MetricsView.as_view({'get': 'list'}), 'metrics')


admin.site.site_header = 'Admin panel'
admin.site.site_title = settings.VST_PROJECT
admin.site.index_title = f"{settings.VST_PROJECT.upper()} Settings Panel"
admin.site.site_url = "/"
# TODO: make it depends on 'gui_enabled' when auth migrate to API
admin.site.login = AdminLoginLogoutRedirectView.as_view(  # type: ignore
    url=get_valid_url(settings.ACCOUNT_URL, settings.LOGIN_URL)
)
admin.site.logout = AdminLoginLogoutRedirectView.as_view(  # type: ignore
    url=get_valid_url(settings.ACCOUNT_URL, settings.LOGOUT_URL)
)
doc_url = getattr(settings, 'DOC_URL', '/docs/')[1:]

urlpatterns = list(URLHandlers()) if gui_enabled else []

urlpatterns += [
    path(settings.ACCOUNT_URL, include(list(URLHandlers('ACCOUNT_URLS'))))
]

urlpatterns += [
    path('admin/', admin.site.urls),
] if getattr(settings, 'ENABLE_ADMIN_PANEL', False) else []

urlpatterns += [re_path(rf'^{settings.API_URL}/', include(router.urls))]
if settings.STATIC_URL.startswith('/'):
    urlpatterns.append(
        re_path(r"^%s(?P<path>.*)$" % re.escape(settings.STATIC_URL.lstrip("/")), static_serve)
    )
if settings.MEDIA_URL.startswith('/') and settings.MEDIA_ROOT:
    urlpatterns.append(re_path(
        r"^%s(?P<path>.*)$" % re.escape(settings.MEDIA_URL.lstrip("/")),
        functools.partial(serve, document_root=settings.MEDIA_ROOT)
    ))
if settings.HAS_DOCS:
    urlpatterns +=  [
        path(
            f'{settings.DOC_URL[1:]}',
            view=serve,
            kwargs={'path': 'index.html', 'document_root': settings.DOCS_ROOT}
        ),
        re_path(
            r"^%s(?P<path>.*)$" % re.escape(settings.DOC_URL.lstrip("/")),
            functools.partial(serve, document_root=settings.DOCS_ROOT)
        )
    ]
