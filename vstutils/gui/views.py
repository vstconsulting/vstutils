#  pylint: disable=bad-super-call,unused-argument
import typing as _t
from pathlib import Path

from markdown import markdown
from django.http.response import Http404
from django.contrib.auth.decorators import login_required
from django.views.generic import TemplateView
from django.template.response import TemplateResponse
from django.conf import settings
from django.urls import reverse_lazy
from jsmin import jsmin

from ..utils import lazy_translate as __


class BaseView(TemplateView):
    login_required = False
    minify_response = True

    def dispatch(self, request, *args, **kwargs):
        response = super().dispatch(request, *args, **kwargs)
        if not self.minify_response:
            response.minify_response = False  # type: ignore
        return response

    @classmethod
    def as_view(cls, *args, **kwargs):
        view = super().as_view(*args, **kwargs)
        return cls.login_required and login_required(view, login_url=reverse_lazy('login')) or view  # type: ignore


class OfflineView(BaseView):
    login_required = False
    template_name = "gui/offline.html"


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


class BaseAgreementsView(TemplateView):
    template_name = 'registration/base_agreements.html'
    title_message = __('Terms')
    path_in_settings: str

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['header_message'] = self.title_message
        path = Path(_t.cast(str, getattr(settings, self.path_in_settings, None)))
        translated_file_path = path.with_name(path.name + f'.{self.request.language.code}')  # type: ignore

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
