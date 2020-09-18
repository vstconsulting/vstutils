from django.urls import re_path
from channels.routing import URLRouter
from ..utils import ObjectHandlers


ws_router = URLRouter([
    re_path(rf"^ws/{path}/$", consumer)
    for path, consumer in ObjectHandlers('WS_CONSUMERS').items()
])
