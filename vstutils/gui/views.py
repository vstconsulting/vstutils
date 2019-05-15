#  pylint: disable=bad-super-call,unused-argument
import json
from django.contrib.auth.decorators import login_required
from django.views.generic import TemplateView
from django.contrib.auth import views as auth
from django.conf import settings


class BaseView(TemplateView):
    login_required = False

    @classmethod
    def as_view(cls, *args, **kwargs):
        view = super(BaseView, cls).as_view(*args, **kwargs)
        return cls.login_required and login_required(view) or view


class GUIView(BaseView):
    login_required = True
    template_name = "gui/gui.html"


class ManifestView(BaseView):
    login_required = False
    template_name = "gui/manifest.json"
    default_pwa_manifest = {
        "name": settings.PROJECT_GUI_NAME,
        "short_name": settings.VST_PROJECT,
        "theme_color": "rgb(236,240,245)",
        "background_color": "rgb(236,240,245)",
        "display": "fullscreen",
        "scope": "/#",
        "start_url": "/#"
    }

    def get_context_data(self, **kwargs):
        context = super(ManifestView, self).get_context_data(**kwargs)
        manifest_data = dict(**self.default_pwa_manifest)
        manifest_data.update(getattr(settings, 'PWA_MANIFEST', {}))
        context['manifest_data'] = json.dumps(manifest_data, indent=4, skipkeys=True)
        return context


class Login(auth.LoginView):
    template_name = 'auth/login.html'
    redirect_authenticated_user = True


class Logout(auth.LogoutView):
    next_page = '/login/'
