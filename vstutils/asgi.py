import os
import posixpath

from django.conf import settings
from django.core.asgi import get_asgi_application
from django.contrib.staticfiles import finders
from fastapi import FastAPI
from fastapi.responses import PlainTextResponse, FileResponse
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles


NOT_FOUND_RESPONSE = PlainTextResponse('Not found', status_code=404)
static_app = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)
static_app.add_middleware(GZipMiddleware)

application = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)
application.mount(settings.STATIC_URL, static_app)

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
async def static(file_path: str):
    absolute_path = finders.find(posixpath.normpath(file_path).lstrip("/"))
    if not absolute_path or os.path.isdir(absolute_path):
        return NOT_FOUND_RESPONSE
    return FileResponse(absolute_path)

application.mount("/", get_asgi_application())
