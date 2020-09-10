from django.conf.urls import url
from django.contrib import admin

app_name = 'suburls_app'

urlpatterns = [
    url(r'^admin/', admin.site.urls),
    url(r'^', admin.site.urls),
]
