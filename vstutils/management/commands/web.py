from __future__ import unicode_literals
import os
import sys
import time
from subprocess import CalledProcessError
import subprocess
import signal
import six
from django.conf import settings
from ._base import BaseCommand
from ...utils import raise_context

python_exec_dir = os.path.dirname(sys.executable)
python_subexec_dir = '/usr/local/bin'
_uwsgi_default_path = os.path.join(python_exec_dir, 'uwsgi')
_uwsgi_default_path_alt = os.path.join(python_exec_dir, 'pyuwsgi')
_uwsgi_default_path_alt2 = os.path.join(python_subexec_dir, 'uwsgi')
_uwsgi_default_path_alt3 = os.path.join(python_subexec_dir, 'pyuwsgi')
if not os.path.exists(_uwsgi_default_path) and os.path.exists(_uwsgi_default_path_alt):
    _uwsgi_default_path = _uwsgi_default_path_alt
elif os.path.exists(_uwsgi_default_path_alt2):
    _uwsgi_default_path = _uwsgi_default_path_alt2
elif os.path.exists(_uwsgi_default_path_alt3):
    _uwsgi_default_path = _uwsgi_default_path_alt3


def wait(proc, timeout=None, delay=0.1):
    while proc.poll() is None and (timeout or timeout is None):
        time.sleep(delay)
        if timeout is not None:
            timeout -= delay
    return proc.poll()


class Command(BaseCommand):
    help = "Backend web-server."
    _uwsgi_default_path = _uwsgi_default_path
    default_addrport = settings.WEB_ADDRPORT

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            'args',
            metavar='uwsgi_arg=value', nargs='*',
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
        parser.add_argument(
            '--addrport', '-p',
            default=self.default_addrport,
            dest='addrport', help='Specifies the uwsgi address:port. Default: [:8080]',
        )

    def _get_uwsgi_arg(self, arg):
        return arg if isinstance(arg, six.string_types) else None

    def _get_uwsgi_args(self, *uwsgi_args):
        args = []
        if settings.WEB_DAEMON:
            args.append('daemonize={}'.format(settings.WEB_DAEMON_LOGFILE))
        args += [self._get_uwsgi_arg(arg) for arg in uwsgi_args]
        return args

    def _get_worker_options(self):
        cmd = []
        if not settings.RUN_WORKER:
            return cmd
        worker_options = settings.WORKER_OPTIONS
        options = ''
        for key, value in worker_options.items():
            is_boolean = isinstance(value, bool)
            if (is_boolean and value) or value:
                options += ' --{}'.format(key)
            if is_boolean:
                continue
            options += "={}".format(value.replace(',', r'\,'))
        if '--queues' not in options:
            options += ' --queues={}'.format(r'\,'.join(settings.WORKER_QUEUES))
        cmd += ['--attach-daemon2']
        run = 'stopsignal=15,reloadsignal=1,'
        run += 'exec={} -m celery worker'.format(settings.PYTHON_INTERPRETER)
        run += options
        cmd += [run]
        return cmd

    def handle(self, *uwsgi_args, **opts):
        super().handle(*uwsgi_args, **opts)
        cmd = [
            opts['script'],
            '--enable-threads',
            '--master',
            '--offload-threads=%k',
            '--static-gzip-all'
        ]
        cmd += ['--http={}'.format(opts['addrport'])]
        cmd += [
            '--{}'.format(arg) for arg in self._get_uwsgi_args(*uwsgi_args)
            if arg is not None
        ]
        if not os.path.exists(opts['config']):
            raise self.CommandError("Doesn't exists: {}.".format(opts['config']))
        cmd += [opts['config']]
        for static_path in settings.STATIC_FILES_FOLDERS:
            if "/static={}".format(static_path) not in cmd:
                cmd += ['--static-map', "/static={}".format(static_path)]
        cmd += self._get_worker_options()
        try:
            self._print('Execute: ' + ' '.join(cmd))
            proc = subprocess.Popen(cmd, env=os.environ.copy())
            try:
                wait(proc)
            except BaseException as exc:
                proc.send_signal(signal.SIGTERM)
                wait(proc, 10)
                with raise_context():
                    proc.kill()
                wait(proc)
                raise exc
        except KeyboardInterrupt:
            self._print('Exit by user...', 'WARNING')
        except CalledProcessError as err:
            raise self.CommandError(str(err))
        except BaseException as err:
            self._print(str(err), 'ERROR')
            raise
