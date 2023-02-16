import uvicorn
from django.conf import settings
from django.utils.module_loading import import_string
from django.core.management.commands import runserver

from ._base import BaseCommand


class Command(BaseCommand):
    help = runserver.Command.help
    default_addrport = settings.WEB_ADDRPORT

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            '--addrport', '-p',
            default=self.default_addrport,
            dest='addrport', help='Specifies the uwsgi address:port. Default: [:8080]',
        )
        parser.add_argument(
            '--no-access-log',
            action='store_false', dest='access_log', default=True,
            help="Disable access logs.",
        )

    def handle(self, *args, **opts):
        super().handle(*args, **opts)

        host, port = opts.pop('addrport').split(':')
        if not host:
            host = '127.0.0.1'

        uvicorn.run(
            app=import_string(settings.ASGI_APPLICATION),
            access_log=opts['access_log'],
            log_level=self.LOG_LEVEL.lower(),
            interface='asgi3',
            host=host,
            port=int(port),
        )
