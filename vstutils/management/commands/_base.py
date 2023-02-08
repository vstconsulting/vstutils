# pylint: disable=abstract-method,unused-import,undefined-variable
import json
import os
import logging
import tempfile
import sys
import time
import traceback
from pathlib import Path
import subprocess
from collections import OrderedDict

from environ import Env
from django.conf import settings
from django.core.management.base import (
    BaseCommand as _BaseCommand,
    CommandError as CmdError,
)
from configparserc.config import ConfigParserC, Section, BoolType
from vstutils.utils import Lock


tmp = tempfile.tempdir
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
        config = self.prepare_config()
        self.env[self._settings('CONFIG_ENV_DATA_NAME')] = config.generate_config_string()
        default_envs = {
            'UWSGI_PROCESSES': 'UWSGI_WORKERS',
            'UWSGI_THREADS': 'UWSGI_THREADS'
        }
        for key in default_envs:  # pylint: disable=consider-using-dict-items
            value = os.environ.get(f"{self.prefix}_{key}", '')
            if value:
                self.env[default_envs[key]] = value  # nocv

        if config['main']['debug'] or self._settings('TESTS_RUN', False):
            logger.debug(f'Env:\n{json.dumps(self.env, indent=4)}')
            logger.debug(f'Config:\n{self.env[self._settings("CONFIG_ENV_DATA_NAME")]}')

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

    def prepare_section_main(self, config):
        config['main'] = {
            'debug': os.getenv(f'{self.prefix}_DEBUG', self._settings('DEBUG')),
            'log_level': self.log_level,
            'timezone': os.getenv(f'{self.prefix}_TIMEZONE', self._settings('TIME_ZONE')),
            'enable_admin_panel': os.getenv(f'{self.prefix}_ENABLE_ADMIN_PANEL', 'false'),
            'first_day_of_week': os.getenv(
                f'{self.prefix}_FIRST_DAY_OF_WEEK',
                self._settings('FIRST_DAY_OF_WEEK')
            )
        }
        # ldap-server, ldap-default-domain if exist
        ldap_server = os.getenv(f'{self.prefix}_LDAP_CONNECTION', None)
        if ldap_server:  # nocv
            config['main']['ldap_server'] = ldap_server
        ldap_default_domain = os.getenv(f'{self.prefix}_LDAP_DOMAIN', None)
        if ldap_default_domain:  # nocv
            config['main']['ldap-default-domain'] = ldap_default_domain

    def prepare_section_db(self, config):
        # Check if configured via default url
        if Env.DEFAULT_DATABASE_ENV in os.environ:  # nocv
            return  # Get data via standard settings mechanism

        # SQLite prepearing
        sqlite_default_dir = os.path.join(os.environ.get(f'{self.prefix}_SQLITE_DIR', str(Path.home())), '')
        if not os.path.exists(sqlite_default_dir):  # nocv
            os.makedirs(sqlite_default_dir)
        sqlite_db_path = os.path.join(sqlite_default_dir, os.environ.get(f'{self.prefix}_SQLITE_DBNAME', 'db.sqlite3'))

        if os.getenv(f'{self.prefix}_DB_HOST') is not None:
            try:
                pm_type = os.getenv(f'{self.prefix}_DB_TYPE', 'mysql')

                default_port = ''
                if pm_type == 'mysql':
                    default_port = '3306'
                elif pm_type == 'postgresql':  # nocv
                    default_port = '5432'

                config['database'] = {
                    'engine': f'django.db.backends.{pm_type}',
                    'name': os.environ[f'{self.prefix}_DB_NAME'],
                    'user': os.environ[f'{self.prefix}_DB_USER'],
                    'password': os.environ[f'{self.prefix}_DB_PASSWORD'],
                    'host': os.environ[f'{self.prefix}_DB_HOST'],
                    'port': os.getenv(f'{self.prefix}_DB_PORT', default_port),
                }
                config['database.options'] = {
                    'connect_timeout': os.getenv(f'{self.prefix}_DB_CONNECT_TIMEOUT', '20'),
                }
                if pm_type == 'mysql':
                    config['database.options']['init_command'] = os.getenv('DB_INIT_CMD', '')
            except KeyError as err:  # nocv
                raise Exception(
                    f'Not enough variables for connect to  SQL server. Variable {str(err)} is required.'
                ) from err
        else:  # nocv
            config['database'] = {
                'engine': 'django.db.backends.sqlite3',
                'name': sqlite_db_path
            }

    def prepare_section_cache(self, config):
        # Check if configured via default url
        if Env.DEFAULT_CACHE_ENV in os.environ:  # nocv
            return  # Get data via standard settings mechanism

        cache_type = os.getenv(f'{self.prefix}_CACHE_TYPE', 'file')
        if cache_type == 'file':
            cache_engine = 'django.core.cache.backends.filebased.FileBasedCache'
        elif cache_type == 'memcache':  # nocv
            cache_engine = 'django.core.cache.backends.memcached.MemcachedCache'
        elif cache_type == 'redis':  # nocv
            cache_engine = 'django.core.cache.backends.redis.RedisCache'
        else:  # nocv
            raise Exception(f'Unknown cache type `{cache_type}`.')

        config['cache'] = config['locks'] = config['session'] = config['etag'] = {
            'backend': cache_engine,
            'location': os.getenv('CACHE_LOCATION', f'{tmp}/{self.prefix}_django_cache')
        }

    def prepare_section_rpc(self, config):
        rpc_connection = os.getenv('RPC_ENGINE', None)
        config['rpc'] = {
            'heartbeat': os.getenv('RPC_HEARTBEAT', '5'),
            'concurrency': os.getenv('RPC_CONCURRENCY', '4'),
            'clone_retry_count': os.getenv('RPC_CLONE_RETRY_COUNT', '3')
        }

        if rpc_connection:  # nocv
            config['rpc']['connection'] = rpc_connection
        config['rpc']['enable_worker'] = 'false'

        # Set worker settings
        if os.environ.get('WORKER', '') == 'ENABLE':  # nocv
            config['rpc']['enable_worker'] = 'true'
            config['worker'] = {
                'loglevel': self.log_level,
                'pidfile': f'{tmp}/{self.prefix.lower()}_worker.pid',
                'beat': os.getenv(f'{self.prefix}_SCHEDULER_ENABLE', 'true')
            }

    def prepare_section_web(self, config):
        config['web'] = {
            'session_timeout': os.getenv(f'{self.prefix}_SESSION_TIMEOUT', '2w'),
            'rest_page_limit': os.getenv(f'{self.prefix}_WEB_REST_PAGE_LIMIT', '100'),
            'enable_gravatar': os.getenv(f'{self.prefix}_WEB_GRAVATAR', 'true'),
            'request_max_size': os.getenv(
                f'{self.prefix}_REQUEST_MAX_SIZE',
                self._settings('DATA_UPLOAD_MAX_MEMORY_SIZE')
            ),
            'x_frame_options': os.getenv(
                f'{self.prefix}_X_FRAME_OPTIONS',
                self._settings('X_FRAME_OPTIONS')
            ),
            'use_x_forwarded_host': os.getenv(
                f'{self.prefix}_USE_X_FORWARDED_HOST',
                self._settings('USE_X_FORWARDED_HOST')
            ),
            'use_x_forwarded_port': os.getenv(
                f'{self.prefix}_USE_X_FORWARDED_PORT',
                self._settings('USE_X_FORWARDED_PORT')
            ),
            'password_reset_timeout_days': os.getenv(
                f'{self.prefix}_PASSWORD_RESET_TIMEOUT_DAYS',
                self._settings('PASSWORD_RESET_TIMEOUT_DAYS')
            ),
            'secure_browser_xss_filter': os.getenv(
                f'{self.prefix}_SECURE_BROWSER_XSS_FILTER',
                self._settings('SECURE_BROWSER_XSS_FILTER')
            ),
            'secure_content_type_nosniff': os.getenv(
                f'{self.prefix}_SECURE_CONTENT_TYPE_NOSNIFF',
                self._settings('SECURE_CONTENT_TYPE_NOSNIFF')
            ),
            'secure_hsts_include_subdomains': os.getenv(
                f'{self.prefix}_SECURE_HSTS_INCLUDE_SUBDOMAINS',
                self._settings('SECURE_HSTS_INCLUDE_SUBDOMAINS')
            ),
            'secure_hsts_preload': os.getenv(
                f'{self.prefix}_SECURE_HSTS_PRELOAD',
                self._settings('SECURE_HSTS_PRELOAD')
            ),
            'secure_hsts_seconds': os.getenv(
                f'{self.prefix}_SECURE_HSTS_SECONDS',
                self._settings('SECURE_HSTS_SECONDS')
            ),
            'health_throttle_rate': os.getenv(
                f'{self.prefix}_HEALTH_THROTTLE_RATE',
                self._settings('HEALTH_THROTTLE_RATE').replace('/minute', '')
            ),
        }

    def prepare_section_uwsgi(self, config):
        config['uwsgi'] = {
            'thread-stacksize': os.getenv(f'{self.prefix}_UWSGI_THREADSTACK', '40960'),
            'max-requests': os.getenv(f'{self.prefix}_UWSGI_MAXREQUESTS', '50000'),
            'limit-as': os.getenv(f'{self.prefix}_UWSGI_LIMITS', '1024'),
            'pidfile': os.getenv(f'{self.prefix}_UWSGI_PIDFILE', f'{tmp}/{self.prefix.lower()}_web.pid'),
            'daemon': 'false'
        }

        current_addr, current_port = self._settings('WEB_ADDRPORT').split(',')[0].split(':')
        config['uwsgi']['addrport'] = (
            f"{os.getenv(f'{self.prefix}_WEB_HOST', current_addr)}:"
            f"{os.getenv(f'{self.prefix}_WEB_PORT', current_port)}"
        )
        harakiri = os.getenv(f'{self.prefix}_UWSGI_HARAKIRI', '')
        if harakiri:
            config['uwsgi']['harakiri'] = harakiri
        vacuum = os.getenv(f'{self.prefix}_UWSGI_VACUUM', '')
        if vacuum:
            config['uwsgi']['vacuum'] = vacuum

    def prepare_section_smtp(self, config):
        mail_parameters = ['port', 'user', 'password', 'tls', 'ssl', 'from_address']
        mail_settings = {'host': os.environ.get(f'{self.prefix}_MAIL_HOST')}
        if mail_settings['host']:
            for param in mail_parameters:
                value = os.environ.get(f'{self.prefix}_MAIL_{param.upper()}')
                if value:
                    mail_settings[param] = value
            config['mail'] = mail_settings

    def prepare_config(self):
        # pylint: disable=too-many-locals,too-many-branches,too-many-statements
        prefix = self.prefix

        default_sections = (
            'main',
            'db',
            'cache',
            'rpc',
            'web',
            'uwsgi',
            'smtp',
        )
        section_handlers_prefix = 'prepare_section_'
        sections = default_sections + tuple(map(
            lambda y: y.replace(section_handlers_prefix, ''),
            filter(
                lambda x: x.startswith(section_handlers_prefix) and x not in default_sections,
                dir(self)
            )
        ))

        class DockerSection(Section):
            types_map = {
                f'override_{s}': BoolType()
                for s in sections
            }

        # Start configuring config file
        self.config = ConfigParserC(
            format_kwargs=self._settings('KWARGS', {}),
            section_defaults={
                'docker': {
                    s: os.getenv(f'{prefix}_DOCKER_{s.upper()}', 'True')
                    for s in DockerSection.types_map
                }
            },
            section_overload={
                'docker': DockerSection
            },
            format_exclude_sections=('uwsgi',)
        )
        config = self.config
        config.parse_text(settings.CONFIG.generate_config_string())

        # Set log level
        self.log_level = os.getenv(f'{prefix}_LOG_LEVEL', 'WARNING')

        for section_name in sections:
            if config['docker'].getboolean(f'override_{section_name}', fallback=True):
                getattr(self, f'prepare_section_{section_name}')(config)

        # Set secret key
        os.environ.setdefault('SECRET_KEY', 'DISABLE')
        if os.environ['SECRET_KEY'] != 'DISABLE':  # nocv
            with open(f'/etc/{prefix.lower()}/secret', 'w', encoding='utf-8') as secretfile:
                secretfile.write(os.environ['SECRET_KEY'])

        return config
