import typing as _t
import logging
from django.db.models import QuerySet
from django.contrib.auth import get_user_model
from django.http.request import HttpRequest
from .utils import ObjectHandlers
from .ldap_utils import LDAP as __LDAP


_LDAP: _t.Type[__LDAP]
HAS_LDAP: bool
logger: logging.Logger
AbstractUserModel = get_user_model()
GetUserMethodType = _t.Callable[[_t.Any, int], _t.Union[_t.Awaitable[_t.Optional[UserModel]], _t.Optional[UserModel]]]
AuthRes = _t.Optional[UserModel]


def get_secured_cache(key: str) -> _t.Optional[UserModel]:
    ...


def set_secured_cache(key: str, value: UserModel) -> None:
    ...


def cache_user_decorator(func: GetUserMethodType) -> GetUserMethodType:
    ...


class ObjectDoesNotExist(Exception):
    """The requested object does not exist"""
    silent_variable_failure = True


class UserModel(AbstractUserModel):
    DoesNotExist: ObjectDoesNotExist


class BaseAuthBackend:
    def authenticate(self, request: HttpRequest, username: str = None, password: str = None):
        raise NotImplementedError  # nocv

    def patch_user_queryset(self, queryset: QuerySet) -> QuerySet:
        return queryset

    def user_can_authenticate(self, user: UserModel) -> bool:
        ...

    @cache_user_decorator
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
