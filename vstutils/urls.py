# pylint: disable=invalid-name
from django.conf import settings
from django.conf.urls import url, include
from django.contrib import admin
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.generic.base import RedirectView
from rest_framework import permissions
from .api.routers import MainRouter
from .utils import URLHandlers
from .api.views import HealthView


class AdminLoginLogoutRedirectView(RedirectView):
    query_string = True


# Main router for all APIs versions
router = MainRouter(
    perms=(permissions.IsAuthenticated,),
    create_schema=settings.API_CREATE_SCHEMA,
)
router.generate_routers(settings.API)
router.register_view('health', HealthView.as_view({'get': 'list'}), 'health')


admin.site.site_header = 'Admin panel'
admin.site.site_title = settings.VST_PROJECT
admin.site.index_title = "{} Settings Panel".format(settings.VST_PROJECT.upper())
admin.site.site_url = "/"
admin.site.login = AdminLoginLogoutRedirectView.as_view(url=settings.LOGIN_URL)
admin.site.logout = AdminLoginLogoutRedirectView.as_view(url=settings.LOGOUT_URL)
doc_url = getattr(settings, 'DOC_URL', '/docs/')[1:]

urlpatterns = list(URLHandlers().urls())

urlpatterns += [
    url(r'^admin/', admin.site.urls),
] if getattr(settings, 'ENABLE_ADMIN_PANEL', False) else []

urlpatterns += [url(r'^{}/'.format(settings.API_URL), include(router.urls))]
urlpatterns += staticfiles_urlpatterns(settings.STATIC_URL)
if 'docs' in settings.INSTALLED_APPS:  # nocv
    urlpatterns += [url(r'^{}'.format(doc_url), include('docs.urls'))]
