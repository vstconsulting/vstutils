# pylint: disable=invalid-name
import sys
from django.conf import settings
from django.conf.urls import url, include
from django.contrib import admin
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from rest_framework import permissions
from .api.routers import MainRouter
from .utils import ModelHandlers


# Views handler for get views via name
views_hndlr = ModelHandlers('VIEWS')

# Main router for all APIs versions
router = MainRouter(
    perms=(permissions.IsAuthenticated,),
    create_schema=settings.API_CREATE_SCHEMA,
)
router.generate_routers(settings.API)


admin.site.site_header = 'Admin panel'
admin.site.site_title = settings.VST_PROJECT
admin.site.index_title = "{} Settings Panel".format(settings.VST_PROJECT)
admin.site.site_url = "/"
login_url = getattr(settings, 'LOGIN_URL', '/login/')[1:]
logout_url = getattr(settings, 'LOGOUT_URL', '/logout/')[1:]
doc_url = getattr(settings, 'DOC_URL', '/docs/')[1:]

urlpatterns = [
    url(r'^$', views_hndlr['GUI'].as_view()),
    url(r'^{}'.format(login_url), views_hndlr['LOGIN'].as_view(), name='login'),
    url(r'^{}'.format(logout_url), views_hndlr['LOGOUT'].as_view(), {'next_page': '/'}),
]

urlpatterns += [
    url(r'^admin/', admin.site.urls),
] if getattr(settings, 'ENABLE_ADMIN_PANEL', False) else []

urlpatterns += [url(r'^{}/'.format(settings.API_URL), include(router.urls))]
if 'runserver' in sys.argv:  # nocv
    urlpatterns += staticfiles_urlpatterns(settings.STATIC_URL)
else:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
if 'docs' in settings.INSTALLED_APPS:  # nocv
    urlpatterns += [url(r'^{}'.format(doc_url), include('docs.urls'))]
