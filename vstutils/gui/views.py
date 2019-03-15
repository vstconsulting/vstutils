#  pylint: disable=bad-super-call,unused-argument
from django.contrib.auth.decorators import login_required
from django.views.generic import TemplateView
from django.contrib.auth import views as auth
from django.http import HttpResponseRedirect


class BaseView(TemplateView):
    login_required = False

    @classmethod
    def as_view(cls, *args, **kwargs):
        view = super(BaseView, cls).as_view(*args, **kwargs)
        return cls.login_required and login_required(view) or view


class GUIView(BaseView):
    login_required = True
    template_name = "gui/gui.html"


class Login(auth.LoginView):
    template_name = 'auth/login.html'
    redirect_authenticated_user = True


class Logout(auth.LogoutView):
    next_page = '/login/'
