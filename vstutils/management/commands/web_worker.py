# pylint: disable=unused-import,import-outside-toplevel
import os
import sys
import argparse
import traceback
from contextlib import suppress

import uvicorn
from django.conf import settings
from django.utils.module_loading import import_string

from ._base import DockerCommand, logger

UVICORN_PARAMS = [
    'env_file',
    'access_log',
    'workers',
    'proxy_headers',
    'server_header',
    'date_header',
    'backlog',
    'timeout_keep_alive',
    'ssl_keyfile',
    'ssl_certfile',
    'ssl_keyfile_password',
    'ssl_ca_certs',
    'ssl_ciphers',
    'forwarded_allow_ips',
]


class FileAction(argparse.Action):
    def __call__(self, parser, namespace, values, option_string=None):
        if not os.path.exists(values) or not os.path.isfile(values):
            parser.error(f"{values} is not a valid file.")
        setattr(namespace, self.dest, str(values))


class Command(DockerCommand):
    help = "Run the application using Uvicorn server."
    interactive = False

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            '--addrport', '-p',
            default=settings.WEB_ADDRPORT,
            dest='addrport', help='Specifies the web server address:port. Default: [:8080]',
        )

        parser.add_argument('--access-log', action=argparse.BooleanOptionalAction,
                            help='Enable or disable access logs.')
        parser.add_argument('--workers', type=int, help='Number of worker processes.')
        parser.add_argument('--proxy-headers', action=argparse.BooleanOptionalAction,
                            help='Enable or disable proxy headers.')
        parser.add_argument('--server-header', action=argparse.BooleanOptionalAction,
                            help='Enable or disable server header.')
        parser.add_argument('--date-header', action=argparse.BooleanOptionalAction,
                            help='Enable or disable date header.')
        parser.add_argument('--forwarded-allow-ips', action='append',
                            help='List of IPs to allow for forwarded headers.')
        parser.add_argument('--backlog', type=int, help='Maximum number of connections to hold in backlog.')
        parser.add_argument('--timeout-keep-alive', type=int, help='Timeout for keeping connections alive.')
        parser.add_argument('--ssl-keyfile', type=str, action=FileAction, help='SSL key file path.')
        parser.add_argument('--ssl-certfile', type=str, action=FileAction, help='SSL certificate file path.')
        parser.add_argument('--ssl-keyfile_password', type=str, help='Password for the SSL key file.')
        parser.add_argument('--ssl-ca_certs', type=str, action=FileAction, help='CA certificates file path.')
        parser.add_argument('--ssl-ciphers', type=str, action=FileAction, help='Ciphers to use for SSL.')

    def handle(self, *args, **options):
        super().handle(*args, **options)

        addrport = options['addrport']
        app = import_string(settings.ASGI_APPLICATION)

        uvicorn_settings = settings.CONFIG['uvicorn'].all()
        with suppress(ImportError):
            import uvloop  # noqa: F401
            uvicorn_settings.setdefault('loop', 'uvloop')
            logger.debug('Uvloop installed.')

        with suppress(ImportError):
            import h11  # noqa: F401
            uvicorn_settings.setdefault('http', 'h11')
            logger.debug('H11 installed.')

        host, port = addrport.split(':')
        host = host or '0.0.0.0'  # nosec
        port = int(port) if port else 8080

        logger.debug(f'Run server on {host}:{port}.')

        uvicorn_settings['use_colors'] = not options['no_color'] or options['force_color']
        for setting in UVICORN_PARAMS:
            if (opt := options.get(setting.replace('-', '_'))) is not None:
                uvicorn_settings[setting] = opt

        config = uvicorn.Config(
            app=app,
            host=host,
            port=port,
            interface='asgi3',
            log_level=self.LOG_LEVEL.lower(),
            headers=settings.WEB_SERVER_HEADERS or None,
            **uvicorn_settings,
        )

        server = uvicorn.Server(config)
        try:
            server.run()
        except KeyboardInterrupt:
            self._print('Exit by user...', 'WARNING')
        except BaseException as err:  # noqa: B036
            if options['traceback']:  # nocv
                self._print(traceback.format_exc())  # nocv
            self._print(str(err), 'ERROR')
            sys.exit(1)  # nocv
