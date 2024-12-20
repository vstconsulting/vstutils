import warnings
import sys
from subprocess import check_call

from django.conf import settings

from ._base import DockerCommand


class Command(DockerCommand):
    interactive = True
    help = "Run web server with configuration from ENV."

    def handle(self, *args, **options):
        warnings.warn('This command is deprecated and will be removed in 6.x releases. Use "rpc_worker" instead.',
                      category=DeprecationWarning,
                      stacklevel=2)
        options['migrate'] = settings.CONFIG['docker'].getboolean('migration', fallback=options['migrate'])
        super().handle(*args, **options)

        try:
            check_call(
                [sys.executable, '-m', self.project_name, self._settings('WEBSERVER_COMMAND', 'web')],
                env=self.env, bufsize=0, universal_newlines=True,
            )
        except KeyboardInterrupt:  # nocv
            self._print('Exit by user...', 'WARNING')
