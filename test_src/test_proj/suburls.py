from django.urls.conf import path
from django.contrib.auth import views as auth
from vstutils.gui.views import BaseView

app_name = 'suburls_app'


class SubURLView(BaseView):
    login_required = True
    template_name = 'test_view_template.html'


class SubURLView2(BaseView):
    login_required = False
    template_name = 'test_view_template.html'


urlpatterns = [
    path('', SubURLView.as_view()),
    path('test/', SubURLView2.as_view()),
    path('login/', auth.LoginView.as_view(), name='login'),
]
