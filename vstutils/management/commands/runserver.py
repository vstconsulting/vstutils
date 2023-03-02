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
        parser.add_argument(
            '--no-reload',
            action='store_false', dest='reload', default=True,
            help="Disable autoreload for project and lib files.",
        )

    def handle(self, *args, **opts):
        super().handle(*args, **opts)

        host, port = opts.pop('addrport').split(':')
        if not host:
            host = '127.0.0.1'

        reload = opts.pop('reload')

        uvicorn.run(
            app=':'.join(settings.ASGI_APPLICATION.rsplit('.', maxsplit=1)),
            access_log=opts['access_log'],
            log_level=self.LOG_LEVEL.lower(),
            interface='asgi3',
            host=host,
            port=int(port),
            reload=reload,
            workers=1,
            reload_dirs=list({
                settings.VSTUTILS_DIR,
                settings.VST_PROJECT_DIR,
                settings.VST_PROJECT_LIB_DIR,
            }) if reload else None,
        )
