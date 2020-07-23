from __future__ import unicode_literals
import typing as _t
import logging
import traceback
from django.core.cache import cache
from django.contrib.auth import get_user_model, backends
from django.db.models import signals
from django.dispatch import receiver
from django.conf import settings
from django.http.request import HttpRequest
from .utils import ObjectHandlers, raise_context
try:
    from .ldap_utils import LDAP as _LDAP
    HAS_LDAP = True
except ImportError:  # nocv
    _LDAP = object
    HAS_LDAP = False

UserModel = get_user_model()
AuthRes = _t.Optional[UserModel]
logger = logging.getLogger(settings.VST_PROJECT_LIB)
user_cache_prefix = 'auth_user_id_val'


if settings.CACHE_AUTH_USER:
    @receiver(signals.post_save, sender=UserModel)
    @receiver(signals.post_delete, sender=UserModel)
    def invalidate_user_from_cache(instance: UserModel, created=False, *args, **kwargs):
        if created:
            return
        cache.delete(f'{user_cache_prefix}_{instance.id}')


def cache_user_decorator(func):
    if not settings.CACHE_AUTH_USER:
        return func  # nocv

    def wrapper(backend, user_id: int):
        cache_key = f'{user_cache_prefix}_{user_id}'
        user = cache.get(cache_key)
        if user is None:
            user = func(backend, user_id)
        if isinstance(user, UserModel):
            cache.set(cache_key, user)
        return user

    return wrapper


class BaseAuthBackend(backends.ModelBackend):
    def authenticate(self, request: HttpRequest, username=None, password=None, **kwargs):
        raise NotImplementedError  # nocv

    @cache_user_decorator
    def get_user(self, user_id: int) -> AuthRes:
        # pylint: disable=protected-access
        try:
            user = UserModel._default_manager.get(pk=user_id)
        except UserModel.DoesNotExist:  # nocv
            return None
        return user if self.user_can_authenticate(user) else None


class LDAP(_LDAP):
    '''
    LDAP class wrapper
    '''


class LdapBackend(BaseAuthBackend):  # nocv
    @property
    def domain(self):
        return settings.LDAP_DOMAIN

    @property
    def server(self):
        return settings.LDAP_SERVER

    def authenticate(self, request: HttpRequest, username: _t.Text = None, password: _t.Text = None) -> AuthRes:
        # pylint: disable=protected-access,unused-argument
        if not self.server or not HAS_LDAP:
            return
        try:
            backend = LDAP(self.server, username, password, self.domain)
            if not backend.isAuth():
                return
            user = UserModel._default_manager.get_by_natural_key(backend.domain_user)
            if self.user_can_authenticate(user) and backend.isAuth():
                return user
        except:
            logger.debug(traceback.format_exc())
            return


class AuthPluginsBackend(BaseAuthBackend):
    auth_handlers = ObjectHandlers('AUTH_PLUGINS')
    auth_header = 'HTTP_X_AUTH_PLUGIN'

    @raise_context()
    def auth_with_plugin(self, plugin: _t.Text, request: HttpRequest, username: _t.Text, password: _t.Text) -> AuthRes:
        return self.auth_handlers.get_object(plugin).authenticate(request, username, password)

    @raise_context()
    def authenticate(self, request: HttpRequest, username: _t.Text = None, password: _t.Text = None) -> AuthRes:
        # pylint: disable=protected-access,unused-argument
        if request and self.auth_header in request.META:
            return self.auth_with_plugin(
                request.META[self.auth_header], request, username, password
            )
        for plugin_name in self.auth_handlers.list():
            result = self.auth_with_plugin(plugin_name, request, username, password)
            if result:
                return result
