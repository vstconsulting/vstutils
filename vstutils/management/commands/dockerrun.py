import sys
from subprocess import check_call

from ._base import DockerCommand


class Command(DockerCommand):
    interactive = True
    help = "Run uwsgi server with configuration from ENV."

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            'args',
            metavar='uwsgi_arg=value', nargs='*',
            help='Args "name=value" uwsgi server.',
        )

    def handle(self, *args, **options):
        super().handle(*args, **options)

        if not self.config['docker'].getboolean('migration', fallback=True):
            success, error = True, ''  # nocv
        else:
            success, error = self.migrate(options)
        if success:
            try:
                check_call(
                    [sys.executable, '-m', self.project_name, self._settings('WEBSERVER_COMMAND', 'web')],
                    env=self.env, bufsize=0, universal_newlines=True,
                )
            except KeyboardInterrupt:  # nocv
                self._print('Exit by user...', 'WARNING')
                return
        else:
            self._print(error, 'ERROR')
            sys.exit(10)
