import sys
from subprocess import check_call

from ._base import DockerCommand
from .web import get_celery_command


class Command(DockerCommand):
    help = "Run Celery for web-application"

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            'args',
            metavar='celery_arg=value', nargs='*',
            help='Args "name=value" for the celery app.',
        )
        parser.add_argument(
            '--nomigrate',
            action='store_false', dest='migrate', default=True,
            help="Do NOT run docker command for migration of databases.",
        )

    def handle(self, *uwsgi_args, **opts):
        super().handle(*uwsgi_args, **opts)

        if opts['migrate']:
            self.migrate(opts)

        cmd = f'{sys.executable} -m {get_celery_command()}'
        self._print(f'Execute: {cmd}')
        sys.exit(check_call(
            cmd,
            stdout=sys.stdout,
            stderr=sys.stderr,
            stdin=sys.stdin,
            shell=True,  # nosec
        ))
