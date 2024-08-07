import sys
import asyncio
import signal
import socket

import uvicorn
import uwsgi  # pylint: disable=import-error
import django
from django.conf import settings
from django.utils.module_loading import import_string

try:
    if not settings.RUN_WORKER:
        import uvloop
        uwsgi.log(f'uvloop installed on worker {uwsgi.worker_id()}.')
    else:
        uvloop = None
except ImportError:
    uwsgi.log(f'No uvloop installed on worker {uwsgi.worker_id()}. Run with native asyncio.')
    uvloop = None

try:
    import h11
    uwsgi.log(f'h11 installed on worker {uwsgi.worker_id()}.')
except ImportError:
    uwsgi.log(f'No h11 installed on worker {uwsgi.worker_id()}.')
    h11 = None

django.setup(set_prefix=False)

# Import application
application = import_string(settings.ASGI_APPLICATION)


async def init(fds, app):
    uvicorn_settings = settings.CONFIG['uvicorn'].all()
    if uvloop:
        uvicorn_settings.setdefault('loop', 'uvloop')
    if h11:
        uvicorn_settings.setdefault('http', 'h11')
    config = uvicorn.Config(
        app=app,
        interface='asgi3',
        log_level=settings.LOG_LEVEL.lower(),
        headers=settings.WEB_SERVER_HEADERS or None,
        **uvicorn_settings,
    )
    server = uvicorn.Server(config)
    servers.append(server)
    # Spawn a handler for every uWSGI socket
    sockets = [
        socket.fromfd(fd, socket.AF_INET, socket.SOCK_STREAM)
        for fd in fds
    ]
    try:
        # Run worker server
        await server.serve(sockets=sockets)
        uwsgi.log(
            f'Server uvicorn stopped after {server.server_state.total_requests} requests on worker {uwsgi.worker_id()}.'
        )
    except KeyboardInterrupt:
        uwsgi.log(f'Stopped uvicorn server on worker {uwsgi.worker_id()}')
    except BaseException as exc:
        uwsgi.log(f"uvicorn say: {str(exc)!r} on worker {uwsgi.worker_id()}")
        raise
    finally:
        for sock in sockets:
            # pylint: disable=protected-access
            if not sock._closed:
                sock.close()


def handle_sigterm():
    uwsgi.log(f'Catch SIGTERM signal on worker {uwsgi.worker_id()}')
    for server in servers:
        server.should_exit = True
        server.handle_exit(signal.SIGINT, None)


if __name__ == '__main__':
    # Init event loop and destroy handlers
    loop = asyncio.new_event_loop() if uvloop is None else uvloop.new_event_loop()
    loop.add_signal_handler(signal.SIGTERM, handle_sigterm)

    uwsgi.log(f'Start uvicorn worker {uwsgi.worker_id()}')
    servers: list[uvicorn.Server] = []
    loop.run_until_complete(init(uwsgi.sockets, application))

    uwsgi.log(f'Exiting uvicorn worker {uwsgi.worker_id()}')
    loop.stop()
    loop.close()
    sys.exit(0)
