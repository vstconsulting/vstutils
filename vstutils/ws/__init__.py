# pylint: disable=wrong-import-position
import django
django.setup()

from channels.routing import ProtocolTypeRouter
from channels.auth import AuthMiddlewareStack
from channels.http import AsgiHandler
from .routing import ws_router


application = ProtocolTypeRouter({
    "websocket": AuthMiddlewareStack(ws_router),
    "http": AsgiHandler
})
