from __future__ import unicode_literals
import os
import sys
from subprocess import check_call as cmd_run, CalledProcessError
from django.conf import settings
from ._base import BaseCommand


class Command(BaseCommand):
    help = "Backend web-server."
    _uwsgi_default_path = "{}/uwsgi".format(os.path.dirname(sys.executable))

    def add_arguments(self, parser):
        parser.add_argument(
            'args',
            metavar='[uwsgi args]', nargs='*',
            help='Args "name=value" uwsgi server.',
        )
        parser.add_argument(
            '--uwsgi-path', '-s',
            default=self._uwsgi_default_path, dest='script',
            help='Specifies the uwsgi script.',
        )
        parser.add_argument(
            '--uwsgi-config', '-c',
            default='{}/web.ini'.format(settings.VST_PROJECT_DIR),
            dest='config', help='Specifies the uwsgi script.',
        )

    def handle(self, *uwsgi_args, **opts):
        cmd = [opts['script'], '--enable-threads', '--master']
        cmd += ['--{}'.format(arg) for arg in uwsgi_args]
        if not os.path.exists(opts['config']):
            raise self.CommandError("Doesn't exists: {}.".format(opts['config']))
        cmd += [opts['config']]
        cmd += ['--static-map', "/static={}/static".format(settings.VSTUTILS_DIR)]
        if settings.VSTUTILS_DIR != settings.BASE_DIR:
            cmd += ['--static-map', "/static={}/static".format(settings.BASE_DIR)]
        if settings.VST_PROJECT_DIR != settings.BASE_DIR:
            cmd += ['--static-map', "/static={}/static".format(settings.VST_PROJECT_DIR)]
        try:
            self._print('Execute: ' + ' '.join(cmd))
            cmd_run(cmd)
        except KeyboardInterrupt:
            self._print('Exit by user...', 'WARNING')
        except CalledProcessError as err:
            raise self.CommandError(str(err))
        except BaseException as err:
            self._print(str(err), 'ERROR')
            raise
