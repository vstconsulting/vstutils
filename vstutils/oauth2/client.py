from typing import Optional, TYPE_CHECKING

from django.conf import settings
from authlib.oauth2.rfc6749 import ClientMixin

if TYPE_CHECKING:  # nocv
    from .requests import DjangoOAuth2Request


class SimpleClient(ClientMixin):
    request: 'Optional[DjangoOAuth2Request]'

    def __init__(  # noqa: CFQ002 pylint: disable=too-many-arguments
        self,
        *,
        id: str,
        allowed_grant_types: list[str],
        secret: Optional[str] = None,
        allowed_redirect_uris: Optional[list[str]] = None,
        allowed_response_types: Optional[list[str]] = None,
        token_endpoint_auth_methods: Optional[list[str]] = None,
        default_redirect_uri: Optional[str] = None,
    ):
        self.id = id
        self.allowed_grant_types = allowed_grant_types
        self.secret = secret
        self.allowed_redirect_uris = allowed_redirect_uris or []
        self.allowed_response_types = allowed_response_types or []
        self.token_endpoint_auth_methods = token_endpoint_auth_methods or []
        self.default_redirect_uri = default_redirect_uri
        self.request = None

    def get_client_id(self):
        return self.id

    def check_client_secret(self, client_secret):
        return self.secret == client_secret or (self.secret is None and not client_secret)

    def check_endpoint_auth_method(self, method, endpoint):
        if endpoint == 'token':
            return method in self.token_endpoint_auth_methods
        return True

    def check_grant_type(self, grant_type):
        return grant_type in self.allowed_grant_types

    def get_allowed_scope(self, scope):
        return scope

    def check_redirect_uri(self, redirect_uri: str):
        return redirect_uri in self.allowed_redirect_uris

    def check_response_type(self, response_type: str):
        return response_type in self.allowed_response_types

    def get_default_redirect_uri(self):
        return self.default_redirect_uri


def query_simple_client(client_id: str):
    if client_id in settings.OAUTH_SERVER_CLIENTS:
        return SimpleClient(
            id=client_id,
            **settings.OAUTH_SERVER_CLIENTS[client_id],
        )
