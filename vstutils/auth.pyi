from __future__ import unicode_literals
import typing as _t
import logging
from django.db.models import Model
from django.http.request import HttpRequest
from .utils import ObjectHandlers
from .ldap_utils import LDAP as __LDAP


_LDAP: _t.Type[__LDAP]
HAS_LDAP: bool
logger: logging.Logger


class ObjectDoesNotExist(Exception):
    """The requested object does not exist"""
    silent_variable_failure = True


class UserModel(Model):
    DoesNotExist: ObjectDoesNotExist


class BaseAuthBackend:
    def authenticate(self, request: HttpRequest, username=None, password=None):
        raise NotImplementedError  # nocv

    def user_can_authenticate(self, user: UserModel) -> bool:
        ...

    def get_user(self, user_id: int) -> _t.Union[UserModel, _t.NoReturn]:
        ...


class LDAP(__LDAP):
    ...


class LdapBackend(BaseAuthBackend):
    domain: _t.Union[_t.Text, _t.NoReturn]
    server: _t.Union[_t.Text, _t.NoReturn]

    def authenticate(self, request: HttpRequest, username: _t.Text = None, password: _t.Text = None) -> _t.Union[UserModel, _t.NoReturn]:
        ...


class AuthPluginsBackend(BaseAuthBackend):
    auth_handlers: _t.ClassVar[ObjectHandlers]
    auth_header: _t.ClassVar[_t.Text]

    def auth_with_plugin(self, plugin: _t.Text, request: HttpRequest, username: _t.Text, password: _t.Text) -> _t.Union[bool, _t.NoReturn]:
        return self.auth_handlers.get_object(plugin).authenticate(request, username, password)

    def authenticate(self, request: HttpRequest, username: _t.Text = None, password: _t.Text = None) -> _t.Union[bool, _t.NoReturn]:
        ...
