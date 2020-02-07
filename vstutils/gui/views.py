#  pylint: disable=bad-super-call,unused-argument
from django.contrib.auth.decorators import login_required
from django.views.generic import TemplateView
from django.contrib.auth import views as auth
from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse_lazy
from .forms import RegistrationForm

UserModel = get_user_model()


class BaseView(TemplateView):
    login_required = False

    @classmethod
    def as_view(cls, *args, **kwargs):
        view = super().as_view(*args, **kwargs)
        return cls.login_required and login_required(view) or view


class GUIView(BaseView):
    login_required = True
    template_name = "gui/gui.html"


class OfflineView(BaseView):
    login_required = False
    template_name = "gui/offline.html"


class ManifestView(BaseView):
    login_required = False
    template_name = "gui/manifest.json"


class SWView(BaseView):
    login_required = False
    content_type = 'text/javascript'
    template_name = "gui/service-worker.js"


class AppLoaderView(BaseView):
    login_required = False
    content_type = 'text/javascript'
    template_name = "gui/app-loader.js"


class AppForApiLoaderView(BaseView):
    login_required = False
    content_type = 'text/javascript'
    template_name = "rest_framework/app-for-api-loader.js"


class Login(auth.LoginView):
    template_name = 'auth/login.html'
    redirect_authenticated_user = True


class Logout(auth.LogoutView):
    next_page = settings.LOGIN_URL


class Registration(auth.FormView, BaseView):
    template_name = 'registration/user_registration.html'
    success_url = reverse_lazy('login')
    form_class = RegistrationForm

    def form_valid(self, form):
        form.save()
        return super().form_valid(form)
