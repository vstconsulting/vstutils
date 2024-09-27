from authlib.jose.errors import BadSignatureError
from authlib.oauth2.base import OAuth2Error
from authlib.oauth2.rfc6749 import MissingAuthorizationError, UnsupportedTokenTypeError
from authlib.oauth2.rfc6750 import InvalidTokenError
from django.contrib.auth import get_user
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.request import Request
from rest_framework.response import Response
from vstutils.exceptions import HttpResponseException
from vstutils.utils import add_in_vary

from .authorization_server import protector, SESSION_STORE


class OAuth2ErrorWrapper(HttpResponseException, AuthenticationFailed):
    """
    Base classes explanation:
      * HttpResponseException - to be able to return http response that follows OAuth2 standard.
      * AuthenticationFailed - to allow DRF make all actions necessary in case of failed
      authentication (e.g. set request.user to None).
    """

    def __init__(self, error: "OAuth2Error"):
        super().__init__()
        self.error = error

    def get_response(self):
        status_code, body, headers = self.error()
        return Response(
            status=status_code,
            headers=dict(headers),
            data=body,
        )


def _get_request_token(request: "Request"):
    try:
        return protector.acquire_token(request)
    except (MissingAuthorizationError, UnsupportedTokenTypeError):
        pass
    except InvalidTokenError as exc:
        raise OAuth2ErrorWrapper(exc) from exc
    except BadSignatureError as exc:
        raise AuthenticationFailed() from exc


def get_session(session_key):
    session = SESSION_STORE(session_key)
    session._from_jwt = True  # pylint: disable=protected-access
    return session


class JWTBearerTokenAuthentication(BaseAuthentication):
    def authenticate(self, request: "Request"):
        if token := _get_request_token(request):
            request._request.session = get_session(token['jti'])  # pylint: disable=protected-access
            self.patch_vary(request)
            return get_user(request._request), token  # pylint: disable=protected-access

    def patch_vary(self, request: "Request"):
        if request.parser_context and (view := request.parser_context.get('view')):
            add_in_vary(view.headers, 'authorization')
