import typing as _t
import sys
import asyncio
import signal
import socket
import time

import uvicorn
import uwsgi  # pylint: disable=import-error
import django
from django.core.asgi import get_asgi_application
from django.conf import settings
django.setup()


async def init(servers_list, fds):
    config = uvicorn.Config(
        app=get_asgi_application(),
        interface='asgi3',
        log_level=settings.LOG_LEVEL.lower(),
        **settings.CONFIG['uvicorn'].all(),
    )
    server = uvicorn.Server(config)
    servers_list.append(server)
    await server.serve(sockets=[
        socket.fromfd(fd, socket.AF_INET, socket.SOCK_STREAM)
        for fd in fds
    ])


def destroy():
    uwsgi.log("destroy worker {0}".format(uwsgi.worker_id()))
    for server in servers:
        server.handle_exit(sig=signal.SIGINT, frame=None)
    time.sleep(1)
    sys.exit(0)


def graceful_reload():
    uwsgi.log("graceful reload for worker {0}".format(uwsgi.worker_id()))
    for server in servers:
        server.handle_exit(sig=signal.SIGTERM, frame=None)
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
    loop.run_until_complete(init(servers, uwsgi.sockets))

    # Start accepting requests via socket
    uwsgi.accepting()

    # Graceful shutdown
    destroy()
