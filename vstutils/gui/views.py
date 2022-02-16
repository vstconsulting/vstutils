#  pylint: disable=bad-super-call,unused-argument
from pathlib import Path

from markdown import markdown
from django.http.response import Http404
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
from ..utils import lazy_translate as __


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
        return cls.login_required and login_required(view, login_url=reverse_lazy('login')) or view


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
    content_type = 'application/json'


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

    def get_context_data(self, **kwargs):
        context = super(Login, self).get_context_data(**kwargs)
        context['wait_confirmation'] = self.request.GET.get('confirmation', '') == 'true'
        return context


class Logout(auth.LogoutView):
    next_page = reverse_lazy('login')


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

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if not settings.SEND_CONFIRMATION_EMAIL or 'uid' in context['form'].errors:
            return context
        context['uid'] = self.request.GET.get('uid', '')
        return context

    def get_success_url(self):
        url = super().get_success_url()
        if settings.SEND_CONFIRMATION_EMAIL and not self.request.POST.get('uid', False):
            url += '?confirmation=true'
        return url


class BaseAgreementsView(TemplateView):
    template_name = 'registration/base_agreements.html'
    title_message = __('Terms')
    path_in_settings: str

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['header_message'] = self.title_message
        path = Path(getattr(settings, self.path_in_settings, None))
        translated_file_path = path.with_name(path.name + f'.{self.request.language.code}')

        if translated_file_path.exists():
            path = translated_file_path

        try:
            context['terms'] = markdown(path.read_text(encoding='utf8'))
        except FileNotFoundError as e:
            raise Http404 from e

        return context


class ConsentToProcessingView(BaseAgreementsView):
    path_in_settings = 'CONSENT_TO_PROCESSING_PATH'
    title_message = __('personal data processing policy')


class TermsView(BaseAgreementsView):
    path_in_settings = 'AGREEMENT_TERMS_PATH'
    title_message = __('terms of agreement')
