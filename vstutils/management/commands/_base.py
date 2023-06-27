# pylint: disable=abstract-method,unused-import,undefined-variable
import json
import os
import logging
import sys
import time
import traceback
import subprocess
from collections import OrderedDict

from django.conf import settings
from django.core.management.base import (
    BaseCommand as _BaseCommand,
    CommandError as CmdError,
)
from vstutils.utils import Lock

logger = logging.getLogger(settings.VST_PROJECT)
logger_lib = logging.getLogger(settings.VST_PROJECT_LIB)


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
        style = style or 'HTTP_INFO'
        style = getattr(self.style, style, str)
        self.stdout.write(style(msg))

    def _settings(self, value, default=None):
        return getattr(settings, value, default)

    def _get_versions(self):
        versions = OrderedDict(django=super().get_version())
        versions[self._settings('VST_PROJECT')] = self._settings('PROJECT_VERSION')
        if self._settings('VST_PROJECT') != self._settings('VST_PROJECT_LIB'):
            versions[self._settings('VST_PROJECT_LIB')] = self._settings(
                'PROJECT_LIB_VERSION'
            )
        if self._settings('VST_PROJECT') != "vstutils":
            versions['vstutils'] = self._settings('VSTUTILS_VERSION')
        return versions

    def get_version(self):
        return ' '.join([
            f'{k.title()}={v}' for k, v in self._get_versions().items()
        ])

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

    def handle(self, *args, **options):
        super().handle(*args, **options)
        self.prefix = self._settings('VST_PROJECT_LIB', 'vstutils').upper()
        self.project_name = self._settings('VST_PROJECT', 'vstutils')

        logger.debug(f'Prefix={self.prefix} | Project={self.project_name}')

        self.env = os.environ.copy()
        self.config = self.prepare_config()
        self.env[f'{settings.ENV_NAME}_DAEMON'] = 'false'
        default_envs = {
            'UWSGI_PROCESSES': 'UWSGI_WORKERS',
            'UWSGI_THREADS': 'UWSGI_THREADS'
        }
        for key in default_envs:  # pylint: disable=consider-using-dict-items
            value = os.environ.get(f"{self.prefix}_{key}", '')
            if value:
                self.env[default_envs[key]] = value  # nocv

        if self.config['main']['debug'] or self._settings('TESTS_RUN', False):
            logger.debug(f'Env:\n{json.dumps(self.env, indent=4)}')
            logger.debug(f'Config:\n{self.config.generate_config_string()}')

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
                        subprocess.check_call(
                            [
                                sys.executable,
                                '-m',
                                self.project_name,
                                'migrate',
                                '--database',
                                db_name,
                                *args
                            ],
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
