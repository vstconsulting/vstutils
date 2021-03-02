#  pylint: disable=bad-super-call,unused-argument
from django.contrib.auth.decorators import login_required
from django.views.generic.edit import FormView
from django.views.generic import TemplateView
from django.template.response import TemplateResponse
from django.contrib.auth import views as auth, login
from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse_lazy
from jsmin import jsmin

from .forms import RegistrationForm, TwoFaForm

UserModel = get_user_model()


class BaseView(TemplateView):
    login_required = False
    minify_response = True

    def dispatch(self, request, *args, **kwargs):
        response = super().dispatch(request, *args, **kwargs)
        if not self.minify_response:
            response.minify_response = False
        return response

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
    minify_response = False
    login_required = False
    template_name = "gui/manifest.json"


class JSMinTemplateResponse(TemplateResponse):
    @property
    def rendered_content(self):
        content = super().rendered_content
        return content.__class__(jsmin(content, quote_chars="'\"`"))


class SWView(BaseView):
    login_required = False
    minify_response = False
    content_type = 'text/javascript'
    template_name = "gui/service-worker.js"
    response_class = JSMinTemplateResponse


class Login(auth.LoginView):
    template_name = 'auth/login.html'
    redirect_authenticated_user = True

    def _is_need_tfa(self, request):
        return request.user.is_authenticated and getattr(request.user, 'need_twofa', False)

    def dispatch(self, request, *args, **kwargs):
        if self._is_need_tfa(request):
            self.redirect_authenticated_user = False
        return super(Login, self).dispatch(request, *args, **kwargs)

    def get_form_class(self):
        if self._is_need_tfa(self.request):
            return TwoFaForm
        return super().get_form_class()

    def get_template_names(self):
        if self._is_need_tfa(self.request):
            return ['auth/tfa.html']
        return super().get_template_names()


class Logout(auth.LogoutView):
    next_page = settings.LOGIN_URL


class Registration(FormView, BaseView):
    template_name = 'registration/user_registration.html'
    success_url = reverse_lazy('login')
    form_class = RegistrationForm

    def form_valid(self, form):
        form.request = self.request
        user = form.save()
        if settings.AUTHENTICATE_AFTER_REGISTRATION and user.id is not None:
            login(self.request, user)
        return super().form_valid(form)
