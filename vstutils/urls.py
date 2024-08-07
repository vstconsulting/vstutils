# pylint: disable=invalid-name,consider-using-f-string
import re
import functools

from django.conf import settings
from django.urls.conf import include, re_path, path
from django.views.static import serve
from django.contrib.staticfiles.views import serve as serve_static
from rest_framework import permissions

from .api.routers import MainRouter
from .utils import URLHandlers
from .api.views import HealthView, MetricsView

static_serve = functools.partial(serve_static, insecure=True)
gui_enabled = not settings.API_ONLY

if settings.OAUTH_SERVER_ENABLE:
    if settings.DEFAULT_REGISTRATION_VIEW_ENABLE:
        settings.API['oauth2'].setdefault('registration', {
            'view': 'vstutils.api.registration.views.UserRegistrationViewSet',
        })
        settings.API['oauth2'].setdefault('confirm_email', {
            'view': 'vstutils.api.registration.views.ConfirmEmailViewSet',
        })

    if settings.DEFAULT_PASSWORD_RESET_VIEW_ENABLE:
        settings.API['oauth2'].setdefault('password_reset', {
            'view': 'vstutils.api.password_reset.PasswordResetViewSet',
        })
        settings.API['oauth2'].setdefault('password_reset_confirm', {
            'view': 'vstutils.api.password_reset.PasswordResetConfirmViewSet',
        })


# Main router for all APIs versions
router = MainRouter(perms=(permissions.IsAuthenticated,))
router.generate_routers(settings.API)
router.register_view('health', HealthView.as_view({'get': 'list'}), 'health')
if settings.ENABLE_METRICS_VIEW:
    router.register_view('metrics', MetricsView.as_view({'get': 'list'}), 'metrics')

doc_url = getattr(settings, 'DOC_URL', '/docs/')[1:]

urlpatterns = list(URLHandlers()) if gui_enabled else []

if gui_enabled and settings.OAUTH_SERVER_ENABLE:
    urlpatterns += [
        path(settings.ACCOUNT_URL, include(list(URLHandlers('ACCOUNT_URLS'))))
    ]

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
