#  pylint: disable=bad-super-call,unused-argument
import typing as _t
from pathlib import Path

from markdown import markdown
from django.http.response import Http404
from django.contrib.auth.decorators import login_required
from django.views.generic import TemplateView
from django.template.response import TemplateResponse as BaseTemplateResponse
from django.conf import settings
from django.urls import reverse_lazy
from htmlmin.minify import html_minify

from ..utils import lazy_translate as __


class TemplateResponse(BaseTemplateResponse):
    minify_response = True

    @property
    def rendered_content(self):
        content = super().rendered_content
        if self.minify_response and 'text/html' in self.headers.get('Content-Type', ''):
            return html_minify(content)
        return content  # nocv


class BaseView(TemplateView):
    login_required = False
    response_class = TemplateResponse

    @classmethod
    def as_view(cls, *args, **kwargs):
        view = super().as_view(*args, **kwargs)
        return cls.login_required and login_required(view, login_url=reverse_lazy('login')) or view  # type: ignore


class BaseAgreementsView(BaseView):
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
