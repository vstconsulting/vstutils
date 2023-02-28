# pylint: disable=no-member
import typing as _t
import os
import sys
import time
from pathlib import Path
from subprocess import CalledProcessError
import subprocess
import signal

from django.conf import settings

from ._base import BaseCommand
from ...utils import raise_context

python_exec_dir = Path(os.path.dirname(settings.PYTHON_INTERPRETER))
python_subexec_dir = Path('/usr/local/bin')
_uwsgi_default_path = python_exec_dir / 'uwsgi'
_uwsgi_default_path_alt = python_exec_dir / 'pyuwsgi'
_uwsgi_default_path_alt2 = python_subexec_dir / 'uwsgi'
_uwsgi_default_path_alt3 = python_subexec_dir / 'pyuwsgi'
if not _uwsgi_default_path.exists() and _uwsgi_default_path_alt.exists():
    _uwsgi_default_path = _uwsgi_default_path_alt
elif _uwsgi_default_path_alt2.exists():
    _uwsgi_default_path = _uwsgi_default_path_alt2
elif _uwsgi_default_path_alt3.exists():
    _uwsgi_default_path = _uwsgi_default_path_alt3


def wait(proc, timeout=None, delay=0.01):
    while proc.poll() is None and (timeout or timeout is None):
        time.sleep(delay)
        if timeout is not None:
            timeout -= delay
    return proc.poll()


def get_celery_command(celery_path='celery', command='worker', **kwargs):
    # Format args string.
    options = ''
    app_option = f'--app={settings.VST_PROJECT}.wapp:app'
    args = kwargs.pop('_args', ())
    options += ' '.join(filter(bool, args))
    options += ' '

    if command == 'worker':
        options_dict = {**settings.WORKER_OPTIONS, **kwargs}
    else:
        options_dict = kwargs

    for key, value in options_dict.items():
        if key == 'app':
            app_option = "--app={}".format(value.replace(',', r'\,'))
            continue
        is_boolean = isinstance(value, bool)
        if (is_boolean and value) or value:
            options += f' -{"-" if key != "O" else ""}{key}'
        if is_boolean:
            continue
        options += "{}{}".format('=' if key != 'O' else '', value.replace(',', r'\,'))

    # Add queues list to celery args
    if '--queues' not in options and command == 'worker':
        options += ' --queues={}'.format(r'\,'.join(settings.WORKER_QUEUES))

    # Add arguments to uwsgi cmd list.
    return f'{celery_path} {app_option} {command} {options}'


class Command(BaseCommand):
    help = "Backend web-server."
    _uwsgi_default_path = _uwsgi_default_path
    uwsgi_default_config = Path(os.path.dirname(__file__)).parent.parent / 'web.ini'
    default_addrport = settings.WEB_ADDRPORT
    prefix = getattr(settings, 'VST_PROJECT_LIB', 'vstutils').upper()

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
            default=str(Path(settings.VST_PROJECT_DIR) / 'web.ini'),
            dest='config', help='Specifies the uwsgi script.',
        )
        parser.add_argument(
            '--addrport', '-p',
            default=self.default_addrport,
            dest='addrport', help='Specifies the uwsgi address:port. Default: [:8080]',
        )

    def _get_uwsgi_arg(self, arg):
        return arg if isinstance(arg, str) else None

    def _get_uwsgi_args(self, *uwsgi_args):
        args = []

        # Set `--daemonize` to logfile if `daemon = true`
        if settings.WEB_DAEMON:
            args.append(f'daemonize={settings.WEB_DAEMON_LOGFILE}')

        # Parse command args and setup to uwsgi
        args += [self._get_uwsgi_arg(arg) for arg in uwsgi_args]

        return args

    def _get_worker_options(self):
        cmd: _t.List[str] = []

        # Check that worker is enabled in settings.
        if not getattr(settings, 'RUN_WORKER', False):
            return cmd

        # Add arguments to uwsgi cmd list.
        cmd.append('--attach-daemon2')
        cmd.append(f'stopsignal=15,reloadsignal=1,exec={get_celery_command()}')

        return cmd

    def handle(self, *uwsgi_args, **opts):
        # pylint: disable=too-many-branches
        super().handle(*uwsgi_args, **opts)

        # Environment
        env = os.environ.copy()

        # Build default uwsgi-command options.
        cmd = [
            str(opts['script']),
            f'--set-ph=program_name={settings.VST_PROJECT}',
            f'--set-ph=lib_name={settings.VST_PROJECT_LIB}',
            f'--set-ph=api_path={settings.API_URL}',
            f'--set-ph=vstutils_version={settings.VSTUTILS_VERSION}',
            f'--env=DJANGO_SETTINGS_MODULE={os.getenv("DJANGO_SETTINGS_MODULE")}',
            f'--python-worker-override={settings.UWSGI_WORKER_PATH}',
            f'--socket={opts["addrport"]}'
        ]

        # Import uwsgi-args from this command args (key=value).
        cmd += [
            f'--{arg}' for arg in self._get_uwsgi_args(*uwsgi_args)
            if arg is not None
        ]
        # Import config from project.
        if opts['config'] and Path(opts['config']).exists():
            cmd += [f'--ini={opts["config"]}']

        # Append uwsgi configs.
        for config_file in map(Path, settings.CONFIG_FILES):
            option = f'--{"ini" if config_file.suffix == ".ini" else "yml"}={str(config_file)}'
            if not (config_file.exists() and option not in cmd):
                continue
            if config_file.suffix == '.ini':
                cmd.append(option)
            elif config_file.suffix == '.yml':
                cmd.append(f'--yml={str(config_file)}')

        if self.uwsgi_default_config.exists():
            cmd.append(str(self.uwsgi_default_config))
        else:
            self._print(f'File {str(self.uwsgi_default_config)} doesnt exists.', 'ERROR')

        # Attach worker.
        cmd += self._get_worker_options()

        # Load config data from stdin.
        cmd += ['--ini', '-']

        # Check if it is run under virtualenv
        if sys.prefix != '/usr':
            cmd += [f'--virtualenv={sys.prefix}']
            if sys.prefix not in env["PATH"]:
                env['PATH'] = f'{sys.prefix}/bin:{env["PATH"]}'

        # Get config from env
        read, write = os.pipe()
        os.write(write, os.environ.get(self._settings('CONFIG_ENV_DATA_NAME'), '').encode('utf-8'))
        os.close(write)

        # Run web server
        try:
            self._print('Execute: ' + ' '.join(cmd))
            with subprocess.Popen(cmd, env=env, stdin=read) as proc:
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
