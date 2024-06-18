from django.conf import settings
from django.urls.conf import path
from django.contrib import admin


admin.site.site_header = 'Admin panel'
admin.site.site_title = settings.VST_PROJECT
admin.site.index_title = f"{settings.VST_PROJECT.upper()} Settings Panel"
admin.site.site_url = "/"

urlpatterns = [
    path("admin/", admin.site.urls),
]
