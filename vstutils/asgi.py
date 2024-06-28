import typing
import os
import posixpath
import functools
import hashlib
import time
from datetime import timedelta

import django
import aiofiles.os
from django.conf import settings
from django.apps import apps
from django.core.handlers.asgi import ASGIHandler
from django.contrib.staticfiles import finders
from django.test import override_settings
from django.utils.module_loading import import_string
from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse, FileResponse, ORJSONResponse, Response
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.staticfiles import NotModifiedResponse

from .signals import before_mount_app
from .utils import check_request_etag

if typing.TYPE_CHECKING:
    class ManifestProtocol(typing.Protocol):
        data: dict[str, typing.Any]

SPA_STATIC_MAX_AGE = round(
    timedelta(days=30).total_seconds()
)

if not apps.apps_ready:
    django.setup(set_prefix=False)  # nocv

static_app = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)
static_app.add_middleware(GZipMiddleware)

application = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)

application.mount(settings.STATIC_URL, static_app)
application.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS if not settings.CORS_ORIGIN_ALLOW_ALL else ['*'],
    expose_headers=settings.CORS_EXPOSE_HEADERS,
    allow_origin_regex=settings.CORS_ALLOWED_ORIGIN_REGEX if not settings.CORS_ORIGIN_ALLOW_ALL else None,
    allow_methods=getattr(settings, 'CORS_ALLOW_METHODS', ("GET",)) if not settings.CORS_ORIGIN_ALLOW_ALL else ['*'],
    allow_headers=getattr(settings, 'CORS_ALLOW_HEADERS', ()) if not settings.CORS_ORIGIN_ALLOW_ALL else ['*'],
    allow_credentials=getattr(settings, 'CORS_ALLOWED_CREDENTIALS', settings.CORS_ORIGIN_ALLOW_ALL),
    max_age=getattr(settings, 'CORS_PREFLIGHT_MAX_AGE', 600),
)

if settings.HAS_DOCS:
    application.mount(
        settings.DOC_URL,
        GZipMiddleware(StaticFiles(directory=settings.DOCS_ROOT, html=True)),
        name="docs"
    )

if os.path.exists(settings.MEDIA_ROOT) and settings.MEDIA_URL:
    application.mount(
        settings.MEDIA_URL,
        GZipMiddleware(StaticFiles(directory=settings.MEDIA_ROOT)),
        name="media"
    )


@functools.lru_cache(maxsize=512, typed=True)
def find_absolute_path(file_path: str) -> typing.Optional[str]:
    return finders.find(posixpath.normpath(file_path).lstrip("/"))


@static_app.get('/{file_path:path}')
async def static(file_path: str, request: Request = None):
    absolute_path = find_absolute_path(file_path)
    if not absolute_path or await aiofiles.os.path.isdir(absolute_path):
        return PlainTextResponse('Not found', status_code=404)
    response = FileResponse(
        absolute_path,
        stat_result=await aiofiles.os.stat(absolute_path),
        content_disposition_type='inline'
    )
    if request is not None and StaticFiles.is_not_modified(None, response.headers, request.headers):  # type: ignore
        return NotModifiedResponse(response.headers)
    return response


if settings.OAUTH_SERVER_ENABLE:
    from vstutils.oauth2.endpoints import oauth_authorization_server, openid_configuration

    application.get('/.well-known/oauth-authorization-server')(oauth_authorization_server)
    application.get('/.well-known/openid-configuration')(openid_configuration)


@application.get('/.well-known/{file_path:path}')
async def well_known(file_path: str, request: Request):
    return await static(f'.well-known/{file_path}', request)


before_mount_app.send(sender=application, static=static)

if not any(m.path == f'/{settings.API_URL}/live/' for m in application.routes):
    @application.get(f'/{settings.API_URL}/live/')
    async def api_live_check():
        return ORJSONResponse({"status": "ok"})

if settings.ENABLE_BACKEND_MANIFEST and not any(m.path == '/manifest.json' for m in application.routes):
    manifest: 'ManifestProtocol' = import_string(settings.MANIFEST_CLASS)()

    @application.get('/manifest.json')
    async def gui_manifest(request: Request):
        etag, is_valid = check_request_etag(
            request,
            hashlib.blake2s(settings.FULL_VERSION.encode(), digest_size=6).hexdigest()
        )
        if is_valid:
            return Response(status_code=304, headers={'ETag': etag})
        return ORJSONResponse(manifest.data, headers={'ETag': etag})


@application.get("/favicon.ico")
async def favicon(request: Request):
    return await static('favicon.ico', request)


@application.middleware('http')
async def add_server_timing_header(request: Request, call_next):
    start_time = time.monotonic()
    try:
        response = await call_next(request)
    except RuntimeError as err:  # nocv
        if str(err) == 'No response returned.' and await request.is_disconnected():
            response = Response(status_code=204)
        else:
            raise
    response.headers['Server-Timing'] = f'total_full;dur={round((time.monotonic() - start_time) * 1000, 2)}'
    return response


if not settings.API_ONLY:
    @application.route("/")
    async def root(request: Request):
        return await static('spa/index.html', request)

    @application.get('/spa/{file_path:path}')
    async def serve_spa(file_path: str, request: Request):
        response = await static(f'spa/{file_path}', request)
        if response.status_code == 200:
            response.headers['Cache-Control'] = f'public, max-age {SPA_STATIC_MAX_AGE}'
        return response

if settings.ENABLE_ADMIN_PANEL:
    class ASGIRequest(ASGIHandler.request_class):
        @functools.cached_property
        def urlconf(self):  # nocv
            # pylint: disable=import-outside-toplevel
            from . import admin_urls
            return admin_urls

    class AdminASGIHandler(ASGIHandler):
        request_class = ASGIRequest

        async def __call__(self, scope, receive, send):  # nocv
            scope['root_path'] = ""
            return await super().__call__(scope, receive, send)

    with override_settings(MIDDLEWARE=settings.ADMIN_MIDDLEWARE):
        django_admin_app = AdminASGIHandler()

    admin_application = FastAPI(openapi_url=None, docs_url=None, redoc_url=None, root_path='/admin')
    admin_application.mount("/", django_admin_app)
    application.mount("/admin/", admin_application)

application.mount("/", ASGIHandler())
