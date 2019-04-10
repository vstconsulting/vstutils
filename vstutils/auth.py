from __future__ import unicode_literals
import logging
import traceback
from django.contrib.auth import get_user_model
from django.conf import settings
from .utils import ModelHandlers, raise_context
try:
    from .ldap_utils import LDAP as _LDAP
    HAS_LDAP = True
except ImportError:
    _LDAP = object
    HAS_LDAP = False

UserModel = get_user_model()
logger = logging.getLogger(settings.VST_PROJECT_LIB)


class BaseAuthBackend(object):
    def authenticate(self, request, username=None, password=None):
        raise NotImplementedError  # nocv

    def user_can_authenticate(self, user):
        """
        Reject users with is_active=False. Custom user models that don't have
        that attribute are allowed.
        """
        is_active = getattr(user, 'is_active', None)
        return is_active or is_active is None

    def get_user(self, user_id):
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


class LdapBackend(BaseAuthBackend):
    @property
    def domain(self):
        return settings.LDAP_DOMAIN

    @property
    def server(self):
        return settings.LDAP_SERVER

    def authenticate(self, request, username=None, password=None):
        # pylint: disable=protected-access,unused-argument
        try:
            backend = LDAP(self.server, username, password, self.domain)
            if not backend.isAuth():
                return
            user = UserModel._default_manager.get_by_natural_key(backend.domain_user)
            if self.user_can_authenticate(user) and backend.isAuth():
                return user
        except Exception:
            logger.info(traceback.format_exc())
            return


class AuthPluginsBackend(BaseAuthBackend):
    auth_handlers = ModelHandlers('AUTH_PLUGINS')
    auth_header = 'HTTP_X_AUTH_PLUGIN'

    @raise_context()
    def auth_with_plugin(self, plugin, request, username, password):
        return self.auth_handlers[plugin].authenticate(request, username, password)

    @raise_context()
    def authenticate(self, request, username=None, password=None):
        # pylint: disable=protected-access,unused-argument
        if self.auth_header in request.META:
            return self.auth_with_plugin(
                request.META[self.auth_header], request, username, password
            )
        for plugin_name in self.auth_handlers.list():
            result = self.auth_with_plugin(plugin_name, request, username, password)
            if result:
                return result
