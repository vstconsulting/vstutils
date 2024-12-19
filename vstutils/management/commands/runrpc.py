import warnings

from django.core.management import call_command

from ._base import DockerCommand


class Command(DockerCommand):
    help = "Run Celery for web-application"

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            'args',
            metavar='celery_arg=value', nargs='*',
            help='Args "name=value" for the celery app.',
        )

    def handle(self, *args, **opts):
        warnings.warn('This command is deprecated and will be removed in 6.x releases. Use "rpc_worker" instead.',
                      category=DeprecationWarning,
                      stacklevel=2)
        super().handle(*args, **opts)

        cmd_args = dict(
            arg.split('=')
            for arg in args
        )
        call_command('rpc_worker', migrate=opts['migrate'], **cmd_args)
