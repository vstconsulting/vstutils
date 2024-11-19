from typing import TYPE_CHECKING
from urllib.parse import urljoin, urlunsplit

from django.conf import settings
from django.utils.module_loading import import_string
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from fastapi import Request
from rest_framework.parsers import FormParser
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from drf_orjson_renderer.parsers import ORJSONParser as JSONParser
from vstutils.api.permissions import IsOpenApiRequest
from vstutils.api.responses import HTTP_200_OK

from .authentication import JWTBearerTokenAuthentication

if TYPE_CHECKING:
    from authlib.oauth2.rfc6749 import AuthorizationServer  # nocv

ServerClass = import_string(settings.OAUTH_SERVER_CLASS)
server: "AuthorizationServer" = ServerClass()
UserWrapper = import_string(settings.OAUTH_SERVER_USER_WRAPPER)


class Oauth2Throttle(AnonRateThrottle):
    scope = "oauth2"


class TokenViewSet(APIView):
    parser_classes = [JSONParser, FormParser]
    throttle_classes = [Oauth2Throttle]
    authentication_classes = set()
    permission_classes = set()

    @swagger_auto_schema(
        operation_id="get_token",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "grant_type": openapi.Schema(
                    type=openapi.TYPE_STRING, enum=["password"]
                ),
                "client_id": openapi.Schema(type=openapi.TYPE_STRING),
                "client_secret": openapi.Schema(type=openapi.TYPE_STRING),
                "username": openapi.Schema(type=openapi.TYPE_STRING),
                "password": openapi.Schema(type=openapi.TYPE_STRING),
                "second_factor": openapi.Schema(type=openapi.TYPE_STRING),
            },
            required=[
                "grant_type",
                "username",
                "password",
            ],
        ),
        responses={
            200: "Token response",
            400: openapi.Response(
                description="Bad request",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "error": openapi.Schema(type=openapi.TYPE_STRING),
                        "error_description": openapi.Schema(type=openapi.TYPE_STRING),
                        "second_factor_missing_or_invalid": openapi.Schema(
                            type=openapi.TYPE_BOOLEAN
                        ),
                    },
                    additional_properties=True,
                    required=["error"],
                ),
            ),
        },
    )
    def post(self, request):
        return server.create_token_response(request)


class RevokeTokenViewSet(APIView):
    parser_classes = [JSONParser, FormParser]
    throttle_classes = [Oauth2Throttle]
    authentication_classes = []
    permission_classes = []

    @swagger_auto_schema(
        operation_id="revoke_token",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "token": openapi.Schema(type=openapi.TYPE_STRING),
                "token_type_hint": openapi.Schema(type=openapi.TYPE_STRING),
            },
            required=["token"],
        ),
        responses={
            200: "Token revoked",
        },
    )
    def post(self, request):
        return server.create_endpoint_response("revocation", request)


class TokenIntrospectionViewSet(APIView):
    parser_classes = [JSONParser, FormParser]
    throttle_classes = [Oauth2Throttle]
    authentication_classes = []
    permission_classes = []

    @swagger_auto_schema(
        operation_id="token_introspection",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "token": openapi.Schema(type=openapi.TYPE_STRING),
                "token_type_hint": openapi.Schema(type=openapi.TYPE_STRING),
            },
            required=["token"],
        ),
        responses={
            200: openapi.Response(
                description="Token introspection",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "active": openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        "scope": openapi.Schema(type=openapi.TYPE_STRING),
                        "client_id": openapi.Schema(type=openapi.TYPE_STRING),
                        "username": openapi.Schema(type=openapi.TYPE_STRING),
                        "token_type": openapi.Schema(type=openapi.TYPE_STRING),
                        "exp": openapi.Schema(type=openapi.TYPE_INTEGER),
                        "iat": openapi.Schema(type=openapi.TYPE_INTEGER),
                        "nbf": openapi.Schema(type=openapi.TYPE_INTEGER),
                        "sub": openapi.Schema(type=openapi.TYPE_STRING),
                        "aud": openapi.Schema(type=openapi.TYPE_STRING),
                        "iss": openapi.Schema(type=openapi.TYPE_STRING),
                        "jti": openapi.Schema(type=openapi.TYPE_STRING),
                    },
                    required=["active"],
                ),
            ),
        },
    )
    def post(self, request):
        return server.create_endpoint_response("introspection", request)


class IsAnonAllowed(BasePermission):
    def has_permission(self, request, view):
        return settings.OAUTH_SERVER_ENABLE_ANON_LOGIN


class IsAnyUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user)


class UserInfoView(APIView):
    throttle_classes = [Oauth2Throttle]
    authentication_classes = []
    permission_classes = [IsOpenApiRequest | (IsAnonAllowed & IsAnyUser) | IsAuthenticated]
    authentication_classes = [JWTBearerTokenAuthentication]
    parser_classes = [JSONParser, FormParser]

    @swagger_auto_schema(
        operation_id="userinfo",
        responses={
            200: openapi.Response(
                description="User info",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "sub": openapi.Schema(type=openapi.TYPE_STRING),
                        "name": openapi.Schema(type=openapi.TYPE_STRING),
                        "given_name": openapi.Schema(type=openapi.TYPE_STRING),
                        "family_name": openapi.Schema(type=openapi.TYPE_STRING),
                        "preferred_username": openapi.Schema(type=openapi.TYPE_STRING),
                        "email": openapi.Schema(type=openapi.TYPE_STRING),
                        "anon": openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    },
                    required=["sub"],
                ),
            ),
        },
    )
    def get(self, request):
        user = request.user
        token = request.auth

        return HTTP_200_OK({
            'sub': token['sub'],
            **UserWrapper(user).get_profile_claims(),
        })


def oauth_authorization_server(request: Request):
    base_url = str(request.url)
    conf = {
        # Leave only origin, for example https://test:123
        "issuer": urlunsplit([request.url.scheme, request.url.netloc, "", "", ""]),
        "token_endpoint": urljoin(base_url, f"/{settings.API_URL}/oauth2/token/"),
        "grant_types_supported": ["password", "authorization_code"],
        "response_types_supported": ["token", "code"],
        "revocation_endpoint": urljoin(base_url, f"/{settings.API_URL}/oauth2/revoke/"),
        "introspection_endpoint": urljoin(base_url, f"/{settings.API_URL}/oauth2/introspect/"),
    }
    if settings.OAUTH_SERVER_AUTHORIZATION_ENDPOINT:
        conf['authorization_endpoint'] = settings.OAUTH_SERVER_AUTHORIZATION_ENDPOINT
    return conf


def openid_configuration(request: Request):
    base_url = str(request.url)
    return {
        **oauth_authorization_server(request),
        "userinfo_endpoint": urljoin(base_url, f"/{settings.API_URL}/oauth2/userinfo/"),
    }
