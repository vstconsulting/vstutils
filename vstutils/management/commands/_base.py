# pylint: disable=abstract-method,unused-import,undefined-variable
import subprocess
import traceback
import asyncio
import logging
import signal
import json
import os
import sys
import time
from typing import Optional, Callable

from django.conf import settings
from django.core.management.base import (
    BaseCommand as _BaseCommand,
    CommandError as CmdError,
)
from vstutils.api.schema.info import x_versions
from vstutils.utils import Lock

logger = logging.getLogger(settings.VST_PROJECT)
logger_lib = logging.getLogger(settings.VST_PROJECT_LIB)


async def run_process(
    cmd: str,
    env: Optional[dict] = None,
    timeout: int = 5,
    print_func: Callable[[str], None] = print,
    print_warn: Callable[[str], None] = None,
    print_err: Callable[[str], None] = None
) -> int:
    """
    Asynchronously runs a process and manages its lifecycle.

    :param cmd: Command to execute as a string.
    :param env: Environment variables to use for the process. Defaults to None, using os.environ.
    :param timeout: Timeout (in seconds) to wait for the process to terminate gracefully. Defaults to 5 seconds.
    :param print_func: Function to handle log output. Defaults to the built-in print function.
    :param print_warn: Function to handle warn output. Defaults to ``print_func``.
    :param print_err: Function to handle error output. Defaults to ``print_func``.

    :return: Exit code of the terminated process.
    """
    # Use the default environment if none is provided
    environment = env if env is not None else os.environ.copy()
    print_err = print_err if print_err is not None else print_func
    print_warn = print_warn if print_warn is not None else print_func

    process = None
    restart_event = asyncio.Event()
    should_exit = False  # Flag to track exit condition

    # Signal handler
    def handle_signal(sig):
        nonlocal process, should_exit
        if process is not None:
            print_warn(f"Received signal {sig.name}, stopping process...")
            if sig in {signal.SIGQUIT, signal.SIGTERM}:
                should_exit = True
            asyncio.create_task(stop_and_restart(sig))

    async def stop_and_restart(sig):
        nonlocal process
        try:
            if process.returncode is None:
                print_warn(f"Sending SIGTERM to process group {process.pid}...")
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    await asyncio.wait_for(process.wait(), timeout)
                except asyncio.TimeoutError:
                    print_err(f"Timeout reached, sending SIGKILL to group {process.pid}...")
                    os.killpg(process.pid, signal.SIGKILL)

            if sig == signal.SIGHUP and not should_exit:
                print_warn("Restarting process due to SIGHUP...")
                restart_event.set()
            else:
                print_func("Process stopped due to signal, exiting...")
        except ProcessLookupError:
            pass  # Process already terminated

    # Register signal handlers
    loop = asyncio.get_running_loop()
    loop.add_signal_handler(signal.SIGQUIT, lambda: handle_signal(signal.SIGQUIT))
    loop.add_signal_handler(signal.SIGTERM, lambda: handle_signal(signal.SIGTERM))
    loop.add_signal_handler(signal.SIGHUP, lambda: handle_signal(signal.SIGHUP))

    # Main process execution loop
    while not should_exit:
        restart_event.clear()
        try:
            print_func(f"Starting process: {cmd}")
            # Launch the process in its own process group for child process management
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=None,  # Directly connect stdout to parent process
                stderr=None,
                env=environment,
                preexec_fn=os.setpgrp  # Create a new process group
            )

            await process.wait()

            # Restart the process if it terminated unexpectedly
            if should_exit:
                return process.returncode
            elif restart_event.is_set():
                print_warn("Restarting process due to SIGHUP...")
            else:
                print_warn(f"Process exited with code {process.returncode}. Restarting...")
        except asyncio.CancelledError:
            print_func("Cancelled process execution")
            if process and process.returncode is None:
                await stop_and_restart(signal.SIGTERM)
            return -1

    return -1


def get_celery_command(celery_path=f'{sys.executable} -m celery', command='worker', **kwargs):
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

    # Add arguments to cmd list.
    return f'{celery_path} {app_option} {command} {options}'


class BaseCommand(_BaseCommand):
    interactive = False
    requires_system_checks = ()
    keep_base_opts = False
    help = "Service command for web-application"

    class CommandError(CmdError):
        pass

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.fromfile_prefix_chars = '@'
        parser.add_argument(
            '-l', '--log-level',
            action='store',
            dest='log-level',
            default=False,
            type=str,
            help='Set logs level [debug|warning|error|critical]')
        if self.interactive:
            parser.add_argument(
                '--noinput', '--no-input',
                action='store_false', dest='interactive', default=True,
                help="Do NOT prompt the user for input of any kind.",
            )

    def _print(self, msg, style=None):
        self.stdout.write(self._get_style(style)(msg))

    def _get_style(self, style=None):
        style = style or 'HTTP_INFO'
        return getattr(self.style, style, str)

    def _settings(self, value, default=None):
        return getattr(settings, value, default)

    def _get_versions(self):
        versions = {}
        x_versions_ = x_versions.copy()
        versions['application'] = x_versions_.pop('application')
        lib_version = x_versions_.pop('library')
        if self._settings('VST_PROJECT') != self._settings('VST_PROJECT_LIB'):
            versions[self._settings('VST_PROJECT_LIB')] = lib_version
        versions.update(x_versions_)
        return versions

    def get_version(self):
        warn = self._get_style('WARNING')
        errs = self._get_style('ERROR')
        succ = self._get_style('SUCCESS')
        versions = self._get_versions()
        for lib, ver in versions.items():
            if 'rc' in ver or 'b' in ver:
                versions[lib] = warn(ver)
            elif 'a' in ver:
                versions[lib] = errs(ver)
            else:
                versions[lib] = succ(ver)
        app_version = versions.pop('application')
        return f"{self._settings('VST_PROJECT')}={app_version} (" + ' '.join([
            f'{k.lower()}={v}' for k, v in versions.items()
        ]) + ')'

    def ask_user(self, message, default=None):
        # pylint: disable=import-error
        if getattr(self, 'interactive_mode', False):
            return input(message) or default
        return default

    def ask_user_bool(self, message, default=True):
        reply = self.ask_user(message, 'yes' if default else 'no').lower()
        if reply in ['y', 'yes']:
            return True
        elif reply in ['n', 'no']:
            return False

    def handle(self, *args, **options):
        # pylint: disable=invalid-name
        self.interactive_mode = options.pop('interactive', False)
        LOG_LEVEL = settings.LOG_LEVEL
        if options.get('log-level', False):
            LOG_LEVEL = options.pop('log-level', LOG_LEVEL)
        logger.setLevel(LOG_LEVEL.upper())
        logger_lib.setLevel(LOG_LEVEL.upper())
        self.LOG_LEVEL = LOG_LEVEL.upper()
        os.environ.setdefault('DJANGO_LOG_LEVEL', self.LOG_LEVEL)


class DockerCommand(BaseCommand):
    interactive = True
    with_migration = True

    def add_arguments(self, parser):
        super().add_arguments(parser)
        if self.with_migration:
            parser.add_argument(
                '--migrate-attempts', '-a',
                default=60,
                dest='attempts', help='The number of attempts to migrate.',
            )
            parser.add_argument(
                '--migrate-attempts-sleep-time', '-t',
                default=1,
                dest='attempts_timeout', help='The number of attempts to migrate.',
            )
            parser.add_argument(
                '--nomigrate',
                action='store_false', dest='migrate', default=True,
                help="Do NOT run docker command for migration of databases.",
            )

    def handle(self, *args, **options):
        super().handle(*args, **options)
        self.prefix = self._settings('VST_PROJECT_LIB', 'vstutils').upper()
        self.project_name = self._settings('VST_PROJECT', 'vstutils')

        logger.debug(f'Prefix={self.prefix} | Project={self.project_name}')

        self.env = os.environ.copy()
        self.config = self.prepare_config()
        self.env[f'{settings.ENV_NAME}_DAEMON'] = 'false'
        default_envs: dict[str, str] = {}
        for key in default_envs:  # pylint: disable=consider-using-dict-items
            value = os.environ.get(f"{self.prefix}_{key}", '')
            if value:
                self.env[default_envs[key]] = value  # nocv

        if self.config['main']['debug'] or self._settings('TESTS_RUN', False):
            logger.debug(f'Env:\n{json.dumps(self.env, indent=4)}')
            logger.debug(f'Config:\n{self.config.generate_config_string()}')

        if self.with_migration and options['migrate']:
            _, err = self.migrate(options)
            if err:
                self._print(f'Migration error: {err}', 'ERROR')

    @property
    def databases_to_migrate(self):
        allowed_databases = ('default',) + tuple(set(getattr(settings, 'DOCKER_DATABASES_TO_MIGRATE', ())))
        for db in settings.DATABASES.keys():
            if db in allowed_databases:
                yield db

    def migrate(self, options, *args):
        success = False
        error = 'Unknown error.'
        for i in range(options.get('attempts', 60)):
            try:
                with Lock(
                        self._settings('DOCKERRUN_MIGRATE_LOCK_ID'),
                        1,
                        self._settings('DOCKERRUN_MIGRATE_LOCK_TIMEOUT'),
                        'Migration process still locked by another application process.',
                        int(os.getenv("DOCKER_MIGRATE_LOCK_KEY_TIMEOUT", '0')) or None
                ) as lock:
                    logger.info(f'Migration locked by key: `{lock.id}`')
                    for db_name in self.databases_to_migrate:
                        logger.info(f'Migrating db "{db_name}".')
                        command_args = [
                            sys.executable,
                            '-m',
                            self.project_name,
                            'migrate',
                            *args
                        ]
                        if options.get('no_color', False) and '--no-color' not in command_args:
                            command_args.append('--no-color')
                        if options.get('force_color', False) and '--force-color' not in command_args:
                            command_args.append('--force-color')
                        if options.get('traceback', False) and '--traceback' not in command_args:
                            command_args.append('--traceback')
                        if options.get('verbosity', False) and '--verbosity' not in command_args:
                            command_args.append(f'-v {options["verbosity"]}')
                        if options.get('pythonpath', False) and '--pythonpath' not in command_args:
                            command_args.extend(['--pythonpath', options['pythonpath']])

                        command_args.extend(['--database', db_name])
                        self._print(f'Execute: {" ".join(map(str, command_args))}')
                        subprocess.check_call(
                            command_args,
                            env=self.env,
                            bufsize=0,
                            universal_newlines=True,
                        )
                    logger.info(f'Unlocking migration by key: `{lock.id}`')
            except:
                error = traceback.format_exc()
                logger.debug(f'Migration attempt {i} failed: {sys.exc_info()[1]}')
                self._print(f"Retry #{i}...", 'WARNING')
                time.sleep(options.get('attempts_timeout', 1))
            else:
                success = True
                break
        return success, error

    def prepare_config(self):
        # Start configuring config file
        config = settings.CONFIG

        # Set secret key
        os.environ.setdefault('SECRET_KEY', 'DISABLE')
        if os.environ['SECRET_KEY'] != 'DISABLE':  # nocv
            with open(f'/etc/{self.prefix.lower()}/secret', 'w', encoding='utf-8') as secretfile:
                secretfile.write(os.environ['SECRET_KEY'])

        return config
