import os
import posixpath

from django.conf import settings
from django.core.asgi import get_asgi_application
from django.contrib.staticfiles import finders
from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse, FileResponse
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.staticfiles import NotModifiedResponse

from .signals import before_mount_app


NOT_FOUND_RESPONSE = PlainTextResponse('Not found', status_code=404)
static_app = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)
static_app.add_middleware(GZipMiddleware)

application = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)
application.mount(settings.STATIC_URL, static_app)
application.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS if not settings.CORS_ORIGIN_ALLOW_ALL else ['*'],
    expose_headers=settings.CORS_EXPOSE_HEADERS,
    allow_origin_regex=settings.CORS_ALLOWED_ORIGIN_REGEXES if not settings.CORS_ORIGIN_ALLOW_ALL else None,
    allow_methods=getattr(settings, 'CORS_ALLOW_METHODS', ("GET",)) if not settings.CORS_ORIGIN_ALLOW_ALL else ['*'],
    allow_headers=getattr(settings, 'CORS_ALLOW_HEADERS', ()) if not settings.CORS_ORIGIN_ALLOW_ALL else ['*'],
    allow_credentials=getattr(settings, 'CORS_ALLOWED_CREDENTIALS', settings.CORS_ORIGIN_ALLOW_ALL),
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


@static_app.get('/{file_path:path}')
async def static(file_path: str, request: Request = None):
    absolute_path = finders.find(posixpath.normpath(file_path).lstrip("/"))
    if not absolute_path or os.path.isdir(absolute_path):
        return NOT_FOUND_RESPONSE
    response = FileResponse(absolute_path, stat_result=os.stat(absolute_path))
    if request is not None and StaticFiles.is_not_modified(None, response.headers, request.headers):  # type: ignore
        return NotModifiedResponse(response.headers)
    return response


@application.get('/.well-known/{file_path:path}')
async def well_known(file_path: str, request: Request):
    return await static(f'.well-known/{file_path}', request)


before_mount_app.send(sender=application, static=static)

if not any(m.path == '/' for m in application.routes):
    application.mount("/", get_asgi_application())
