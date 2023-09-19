import typing as _t
import sys
import asyncio
import signal
import socket
import time

import uvicorn
import uwsgi  # pylint: disable=import-error
import django
from django.conf import settings
from django.utils.module_loading import import_string

django.setup(set_prefix=False)

# Import application
application = import_string(settings.ASGI_APPLICATION)


async def init(servers_list, fds, app):
    config = uvicorn.Config(
        app=app,
        interface='asgi3',
        log_level=settings.LOG_LEVEL.lower(),
        headers=settings.WEB_SERVER_HEADERS or None,
        **settings.CONFIG['uvicorn'].all(),
    )
    server = uvicorn.Server(config)
    servers_list.append(server)
    sockets = [
        socket.fromfd(fd, socket.AF_INET, socket.SOCK_STREAM)
        for fd in fds
    ]
    try:
        await server.serve(sockets=sockets)
        uwsgi.log(f'uvicorn server stopped after {server.server_state.total_requests} requests.')
    except BaseException as exc:
        uwsgi.log(f"uvicorn say: {str(exc)}")
        raise
    finally:
        for sock in sockets:
            # pylint: disable=protected-access
            if not sock._closed:
                sock.close()


def destroy():
    uwsgi.log(f"destroy worker {uwsgi.worker_id()}")
    for server in servers:
        server.handle_exit(sig=signal.SIGINT, frame=None)
    time.sleep(1)
    uwsgi.log(f"exit worker {uwsgi.worker_id()}")
    sys.exit(0)


def graceful_reload():
    uwsgi.log(f"graceful reload for worker {uwsgi.worker_id()}")
    for server in servers:
        server.handle_exit(sig=signal.SIGTERM, frame=None)
    time.sleep(1)
    loop.stop()
    loop.close()
    sys.exit(0)


if __name__ == '__main__':
    # Init event loop and destroy handlers
    loop = asyncio.get_event_loop()
    loop.add_signal_handler(signal.SIGINT, destroy)
    loop.add_signal_handler(signal.SIGTERM, destroy)
    loop.add_signal_handler(signal.SIGHUP, graceful_reload)

    # TODO: Does it nessesary?
    servers: _t.List[uvicorn.Server] = []

    # Spawn a handler for every uWSGI socket
    uwsgi.log(f'start uvicorn worker {uwsgi.worker_id()}')
    loop.run_until_complete(init(servers, uwsgi.sockets, application))

    # Start accepting requests via socket
    uwsgi.accepting()

    # Graceful shutdown
    destroy()
