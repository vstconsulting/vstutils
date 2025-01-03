from functools import cached_property
from time import time
from typing import Callable, Optional, TYPE_CHECKING

import orjson
from authlib.integrations.django_oauth2 import (
    AuthorizationServer as BaseAuthorizationServer,
    ResourceProtector,
)
from authlib.common import encoding
from authlib.jose import jwt
from authlib.jose.rfc7519 import jwt as jwt_rfc7519
from authlib.oauth2.rfc6749 import (
    InvalidRequestError,
    RefreshTokenGrant as BaseRefreshTokenGrant,
    ResourceOwnerPasswordCredentialsGrant as BaseResourceOwnerPasswordCredentialsGrant,
    TokenMixin,
)
from authlib.oauth2.rfc6749.authenticate_client import _validate_client, extract_basic_authorization
from authlib.oauth2.rfc7009 import (
    RevocationEndpoint as BaseRevocationEndpoint,
)
from authlib.oauth2.rfc7636 import CodeChallenge
from authlib.oauth2.rfc7662 import (
    IntrospectionEndpoint as BaseIntrospectionEndpoint,
)
from authlib.oauth2.rfc9068 import (
    JWTBearerTokenGenerator as BaseJWTBearerTokenGenerator,
    JWTBearerTokenValidator as BaseJWTBearerTokenValidator,
)
from authlib.oauth2.rfc9068.claims import JWTAccessTokenClaims, JWTClaims
from authlib.integrations.django_oauth2 import requests as django_oauth2_requests
from django.conf import settings
from django.contrib.auth import authenticate, login, get_user
from django.utils.module_loading import import_string
from vstutils.utils import get_session_store

from .authorization_code import AuthorizationCodeGrant, OpenIDCode
from .client import query_simple_client, SimpleClient
from .jwk import jwk_set
from .requests import DjangoOAuth2Request, DjangoOAuthJsonRequest

if TYPE_CHECKING:  # nocv
    from authlib.jose import KeySet
    from django.contrib.auth.models import AbstractBaseUser


SESSION_STORE = get_session_store()
UserWrapper = import_string(settings.OAUTH_SERVER_USER_WRAPPER)
extra_claims_provider: 'Optional[Callable[[AbstractBaseUser], Optional[dict]]]' = (
    import_string(settings.OAUTH_SERVER_JWT_EXTRA_CLAIMS_PROVIDER)
    if settings.OAUTH_SERVER_JWT_EXTRA_CLAIMS_PROVIDER
    else None
)
_json_options = (
    orjson.OPT_SERIALIZE_NUMPY |
    orjson.OPT_NON_STR_KEYS |
    orjson.OPT_SERIALIZE_DATACLASS |
    orjson.OPT_SERIALIZE_UUID
)


def json_dumps(data, ensure_ascii=False):
    result = orjson.dumps(data, option=_json_options)
    if ensure_ascii:
        return result.decode('utf-8').encode('ascii', 'backslashreplace').decode('ascii')  # nocv
    return result.decode('utf-8')


def expires_generator(client, grant_type):
    return settings.OAUTH_SERVER_TOKEN_EXPIRES_IN


class MissingOrInvalidSecondFactorError(InvalidRequestError):
    def __init__(self):
        super().__init__(description='Missing or invalid \"second_factor\" in request.')

    def get_body(self):
        body = super().get_body()
        body.append(('second_factor_missing_or_invalid', True))
        return body


class JWTBearerTokenGenerator(BaseJWTBearerTokenGenerator):
    def __init__(self, refresh_token_generator=None):
        super().__init__(
            issuer=settings.OAUTH_SERVER_ISSUER,
            alg=settings.OAUTH_SERVER_JWT_ALG,
            expires_generator=expires_generator,
            refresh_token_generator=refresh_token_generator,
        )

    def get_jwks(self):
        return jwk_set

    def get_extra_claims(self, client: SimpleClient, grant_type, user: 'UserWrapper', scope):
        claims = {}
        session_key: Optional[str] = None

        if grant_type != 'refresh_token':
            django_request = client.request._request  # pylint: disable=protected-access

            if user.is_anon():
                client.request.ensure_session()
                session_key = django_request.session.session_key
            else:
                client.request.ensure_session()
                login(django_request, user.django_user)
                django_request.session.save()
                session_key = django_request.session.session_key

        elif grant_type == 'refresh_token':
            session_key = client.request.refresh_token.claims['jti']

        claims['jti'] = session_key

        if user.is_anon():
            claims['anon'] = True

        if user_claims := user.get_access_token_claims():
            claims.update(user_claims)

        if extra_claims_provider:
            if extra_claims := extra_claims_provider(user.django_user):
                claims.update(extra_claims)

        return claims


class JWTSessionRefreshTokenGenerator:
    def __init__(self, issuer: str, alg: str, key: 'KeySet'):
        self.issuer = issuer
        self.alg = alg
        self.key = key

    def __call__(self, client: SimpleClient, grant_type, user: 'UserWrapper', scope):
        token_data = {
            'iss': self.issuer,
            'client_id': client.get_client_id(),
            'iat': int(time()),
            'scope': scope,
            'refresh': True,
            'jti': client.request._request.session.session_key,
        }

        if user.is_anon():
            token_data['anon'] = True

        access_token = jwt.encode(
            header={'alg': self.alg, 'typ': 'jwt'},
            payload=token_data,
            key=self.key,
            check=False,
        )
        return access_token.decode()


class JWTBearerTokenValidator(BaseJWTBearerTokenValidator):
    def __init__(self):
        super().__init__(
            issuer=settings.OAUTH_SERVER_ISSUER,
            resource_server=None,
        )

    def get_jwks(self):
        return jwk_set


class ResourceOwnerPasswordCredentialsGrant(BaseResourceOwnerPasswordCredentialsGrant):
    TOKEN_ENDPOINT_AUTH_METHODS = settings.OAUTH_SERVER_CLIENT_AUTHENTICATION_METHODS

    def authenticate_user(self, username, password):
        user = authenticate(
            self.request._request,  # pylint: disable=protected-access
            username=username,
            password=password,
        )
        if not user:
            return
        user = UserWrapper(user)
        if user.second_factor_required():
            if not user.validate_second_factor(
                self.request.data.get('second_factor')
            ):
                raise MissingOrInvalidSecondFactorError()
        return user


class SessionRefreshTokenGrant(BaseRefreshTokenGrant):
    TOKEN_ENDPOINT_AUTH_METHODS = settings.OAUTH_SERVER_CLIENT_AUTHENTICATION_METHODS

    def authenticate_refresh_token(self, refresh_token: str):
        return JWTSessionRefreshToken.decode(refresh_token)

    def authenticate_user(self, refresh_token: 'JWTSessionRefreshToken'):
        return refresh_token.get_user()

    def revoke_old_credential(self, refresh_token):
        pass


class JWTBearerToken(TokenMixin):  # pylint: disable=abstract-method
    def __init__(self, claims: JWTAccessTokenClaims):
        self.claims = claims

    @classmethod
    def decode(cls, token: str):
        try:
            claims = jwt.decode(token, key=jwk_set, claims_cls=JWTAccessTokenClaims)
            claims.validate()
            return cls(claims)
        except:
            return None

    def is_expired(self):
        return self.claims['exp'] < time()

    def is_revoked(self):
        return False


class JWTSessionRefreshToken(TokenMixin):  # pylint: disable=abstract-method
    class RequestMock:
        def __init__(self, session):
            self.session = session

    claims_options = {
        "iss": {
            "essential": True,
            "value": settings.OAUTH_SERVER_ISSUER,
        },
        "client_id": {
            "essential": True,
        },
        "jti": {
            "essential": True,
        },
        "refresh": {
            "essential": True,
            "value": True,
        }
    }

    def __init__(self, claims: 'JWTClaims'):
        self.claims = claims

    @classmethod
    def decode(cls, token: str):
        try:
            claims = jwt.decode(token, key=jwk_set, claims_options=cls.claims_options)
            claims.validate()
            return cls(claims)
        except:
            return None

    @cached_property
    def _session(self):
        session = SESSION_STORE(self.claims['jti'])
        if session.exists(session.session_key):
            return session

    def get_user(self):
        if not self._session:
            return
        user = get_user(self.RequestMock(self._session))
        if user:
            return UserWrapper(user)

    def revoke(self):
        if self._session:
            self._session.delete()

    def check_client(self, client: 'SimpleClient'):
        return client.get_client_id() == self.claims['client_id']

    def get_scope(self):
        return self.claims.get('scope')


class SessionRefreshTokenRevocationEndpoint(BaseRevocationEndpoint):
    CLIENT_AUTH_METHODS = settings.OAUTH_SERVER_CLIENT_AUTHENTICATION_METHODS

    def query_token(self, token_string, token_type_hint):
        return JWTSessionRefreshToken.decode(token_string)

    def revoke_token(self, token: 'JWTSessionRefreshToken', request):
        token.revoke()


class IntrospectionEndpoint(BaseIntrospectionEndpoint):
    CLIENT_AUTH_METHODS = settings.OAUTH_SERVER_CLIENT_AUTHENTICATION_METHODS

    def query_token(self, token_string, token_type_hint):
        return JWTBearerToken.decode(token_string)

    def check_permission(self, token, client, request):
        return True

    def introspect_token(self, token: JWTBearerToken):
        return {
            'sub': token.claims['sub'],
        }


def same_origin_client_secret_post(query_client, request):
    if request.headers.get('Sec-Fetch-Site') == 'same-origin':
        if 'client_id' in request.form:
            data = request.form
        else:
            data = dict(zip(('client_id', 'client_secret'), extract_basic_authorization(request.headers)))

        client_id = data.get('client_id')
        if client_id:
            client_secret = data.get('client_secret')
            client = _validate_client(query_client, client_id, request.state)
            if client.check_client_secret(client_secret):
                return client


class AuthorizationServer(BaseAuthorizationServer):
    def __init__(self):
        super().__init__(client_model=None, token_model=None)

        self.register_grant(
            ResourceOwnerPasswordCredentialsGrant,
            extensions=[
                OpenIDCode(),
                *map(
                    import_string,
                    settings.OAUTH_SERVER_PASSWORD_GRANT_ADDITIONAL_EXTENSIONS,
                ),
            ],
        )
        self.register_grant(
            SessionRefreshTokenGrant,
        )
        self.register_grant(
            AuthorizationCodeGrant,
            extensions=[
                OpenIDCode(),
                CodeChallenge(required=True),
                *map(
                    import_string,
                    settings.OAUTH_SERVER_AUTHORIZATION_CODE_GRANT_ADDITIONAL_EXTENSIONS,
                ),
            ],
        )
        self.register_token_generator(
            'default',
            JWTBearerTokenGenerator(
                refresh_token_generator=JWTSessionRefreshTokenGenerator(
                    issuer=settings.OAUTH_SERVER_ISSUER,
                    alg=settings.OAUTH_SERVER_JWT_ALG,
                    key=jwk_set,
                ),
            ),
        )
        self.register_endpoint(SessionRefreshTokenRevocationEndpoint)
        self.register_endpoint(IntrospectionEndpoint)
        self.register_client_auth_method(
            'same_origin_client_secret_post',
            same_origin_client_secret_post,
        )

    def create_oauth2_request(self, request):
        if request.content_type == 'application/json':
            return DjangoOAuthJsonRequest(request)
        return DjangoOAuth2Request(request)

    def query_client(self, client_id):
        return query_simple_client(client_id)

    def save_token(self, token, request):
        """JWT token should not be saved"""


protector = ResourceProtector()
protector.register_token_validator(JWTBearerTokenValidator())

# Monkey-patching for use orjson
encoding.json_dumps = jwt_rfc7519.json_dumps = json_dumps
encoding.json_loads = jwt_rfc7519.json_loads = django_oauth2_requests.json_loads = orjson.loads
