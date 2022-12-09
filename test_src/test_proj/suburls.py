from django.urls.conf import re_path
from django.contrib import admin

app_name = 'suburls_app'

urlpatterns = [
    re_path(r'^admin/', admin.site.urls),
    re_path(r'^', admin.site.urls),
]
