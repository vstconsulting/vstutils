import sys
from subprocess import check_call

from ._base import DockerCommand, get_celery_command


class Command(DockerCommand):
    help = "Run Celery 'inspect' command"
    with_migration = False

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            'args',
            metavar='celery_arg=value', nargs='*',
            help='Args "name=value" for the celery app.',
        )
        parser.add_argument(
            '-j', '--json',
            action='store_true', dest='json', default=False,
            help="Use json as output format for 'inspect' command.",
        )

    def handle(self, *args, **opts):
        super().handle(*args, **opts)

        cmd_kwargs = dict(
            arg.split('=')
            for arg in args
            if '=' in arg
        )

        cmd_kwargs['_args'] = [
            arg for arg in args
            if '=' not in arg
        ]

        if opts['json']:
            cmd_kwargs['_args'].append('--json')

        cmd = f'{sys.executable} -m {get_celery_command(celery_path="celery", command="inspect", **cmd_kwargs)}'
        self._print(f'Execute: {cmd}')
        sys.exit(check_call(
            cmd,
            stdout=sys.stdout,
            stderr=sys.stderr,
            stdin=sys.stdin,
            shell=True,  # nosec
        ))
