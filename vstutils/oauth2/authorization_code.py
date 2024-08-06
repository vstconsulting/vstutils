
from dataclasses import dataclass, asdict
from typing import Union
import time

from authlib.oidc.core import UserInfo
from authlib.oauth2.rfc6749 import (
    AuthorizationCodeGrant as BaseAuthorizationCodeGrant,
    AuthorizationCodeMixin,
)
from authlib.oidc.core.grants import OpenIDCode as BaseOpenIDCode
from django.conf import settings
from django.contrib.auth import load_backend
from django.core.cache import caches

from .client import SimpleClient
from .requests import DjangoOAuth2Request
from .user import UserWrapper
from .jwk import jwk_set


_auth_code_cache = caches[settings.OAUTH_SERVER_AUTHORIZATION_CODE_CACHE_NAME]
_auth_code_ttl = 300


@dataclass
class AuthorizationCode(AuthorizationCodeMixin):
    code: str
    client_id: str
    redirect_uri: Union[str, None]
    response_type: str
    scope: str
    user_id: str
    auth_time: int
    code_challenge: Union[str, None]
    code_challenge_method: Union[str, None]
    auth_backend_path: str

    @classmethod
    def query(cls, code: str, client_id: str) -> 'Union[AuthorizationCode, None]':
        value = _auth_code_cache.get(cls._get_cache_key(code, client_id))
        if value:
            return cls(**value)
        return None

    @staticmethod
    def _get_cache_key(code: str, client_id: str):
        return f'auth-code:{code}-{client_id}'

    def save(self):
        _auth_code_cache.set(
            self._get_cache_key(self.code, self.client_id),
            asdict(self),
            timeout=_auth_code_ttl,
        )

    def delete(self):
        _auth_code_cache.delete(
            self._get_cache_key(self.code, self.client_id),
        )

    def is_expired(self):
        return self.auth_time + _auth_code_ttl < time.time()

    def get_redirect_uri(self):
        return self.redirect_uri

    def get_scope(self):
        return self.scope or ''

    def get_auth_time(self):
        return self.auth_time

    def get_nonce(self):
        return None


class OpenIDCode(BaseOpenIDCode):  # pylint: disable=abstract-method
    def get_jwt_config(self, grant):
        key = jwk_set.find_by_kid('default')
        return {
            'key': key,
            'alg': key['alg'],
            'iss': settings.OAUTH_SERVER_ISSUER,
            'exp': settings.OAUTH_SERVER_ID_TOKEN_EXPIRES_IN,
        }

    def generate_user_info(self, user: UserWrapper, scope):
        profile = UserInfo(
            sub=user.get_user_id(),
        )
        if profile_claims := user.get_profile_claims():
            profile.update(profile_claims)
        return profile


class AuthorizationCodeGrant(BaseAuthorizationCodeGrant):
    TOKEN_ENDPOINT_AUTH_METHODS = settings.OAUTH_SERVER_CLIENT_AUTHENTICATION_METHODS

    def save_authorization_code(self, code: str, request: DjangoOAuth2Request):
        if not getattr(request.user.django_user, 'backend', None):
            raise ValueError('Property "backend" is missing on user instance')
        client = request.client
        auth_code = AuthorizationCode(
            code=code,
            client_id=client.get_client_id(),
            redirect_uri=request.redirect_uri,
            response_type=request.response_type,
            scope=request.scope,
            user_id=request.user.get_user_id(),
            auth_time=int(time.time()),
            code_challenge=request.data.get('code_challenge'),
            code_challenge_method=request.data.get('code_challenge_method'),
            auth_backend_path=request.user.django_user.backend,
        )
        auth_code.save()
        return auth_code

    def query_authorization_code(self, code, client: SimpleClient):
        code = AuthorizationCode.query(code=code, client_id=client.get_client_id())
        if code and not code.is_expired():
            return code

    def delete_authorization_code(self, authorization_code: AuthorizationCode):
        authorization_code.delete()

    def authenticate_user(self, authorization_code: AuthorizationCode):
        backend = load_backend(authorization_code.auth_backend_path)
        user = backend.get_user(authorization_code.user_id)
        user.backend = authorization_code.auth_backend_path
        if user:
            return UserWrapper(user)
