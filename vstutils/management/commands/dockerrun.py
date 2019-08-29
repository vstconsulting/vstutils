import configparser
import os
import io
import sys
import time
import traceback
from subprocess import check_call
from ._base import BaseCommand


class Command(BaseCommand):
    interactive = True
    help = "Run uwsgi server with configuration from ENV."

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            '--migrate-attempts', '-a',
            default=60,
            dest='attempts', help='The number of attempts to migrate.',
        )

    def handle(self, *args, **options):
        super().handle(*args, **options)
        self.prefix = self._settings('VST_PROJECT_LIB', 'vstutils').upper()
        project_name = self._settings('VST_PROJECT', 'vstutils')
        fp = io.StringIO()
        config = self.prepare_config()
        config.write(fp)
        env = dict()
        env[self._settings('CONFIG_ENV_DATA_NAME')] = fp.getvalue()

        success = False
        error = 'Unknown error.'
        for i in range(options.get('attempts', 60)):
            try:
                check_call(
                    [sys.executable, '-m', project_name, 'migrate'],
                    env=env, bufsize=0, universal_newlines=True,
                )
            except:
                error = traceback.format_exc()
                self._print("Retry #{}...".format(i), 'WARNING')
                time.sleep(1)
            else:
                success = True
                break
        if success:
            try:
                check_call(
                    [sys.executable, '-m', project_name, self._settings('WEBSERVER_COMMAND', 'web')],
                    env=env, bufsize=0, universal_newlines=True,
                )
            except KeyboardInterrupt:  # nocv
                self._print('Exit by user...', 'WARNING')
                return
        else:
            self._print(error, 'ERROR')
            sys.exit(10)

    def prepare_config(self):
        # pylint: disable=too-many-locals,too-many-branches,too-many-statements
        prefix = self.prefix
        # SQLite prepearing
        sqlite_default_dir = os.environ.get('{}_SQLITE_DIR'.format(prefix), '/')
        if sqlite_default_dir != '/' and not os.path.exists(sqlite_default_dir):  # nocv
            os.makedirs(sqlite_default_dir)
        if sqlite_default_dir[-1] != '/':  # nocv
            sqlite_default_dir += '/'
        sqlite_default_name = os.environ.get('{}_SQLITE_DBNAME'.format(prefix), 'db.sqlite3')
        sqlite_db_path = '{db_place}/{db_name}'.format(
            db_place=sqlite_default_dir,
            db_name=sqlite_default_name
        )

        # Start configuring config file
        config = configparser.ConfigParser()
        self.config = config

        # Set log level
        log_level = os.getenv('{}_LOG_LEVEL'.format(prefix), 'WARNING')
        # Set default settings
        config['main'] = {
            'debug': os.getenv('{}_DEBUG'.format(prefix), 'false'),
            'log_level': log_level,
            'timezone': os.getenv('{}_TIMEZONE'.format(prefix), 'UTC'),
            'enable_admin_panel': os.getenv('{}_ENABLE_ADMIN_PANEL'.format(prefix), 'false')
        }
        # ldap-server, ldap-default-domain if exist
        ldap_server = os.getenv('{}_LDAP_CONNECTION'.format(prefix), None)
        if ldap_server:  # nocv
            config['main']['ldap_server'] = ldap_server
        ldap_default_domain = os.getenv('{}_LDAP_DOMAIN'.format(prefix), None)
        if ldap_default_domain:  # nocv
            config['main']['ldap-default-domain'] = ldap_default_domain

        # Set db config
        if os.getenv('{}_DB_HOST'.format(prefix)) != None:  # nocv
            try:
                pm_type = os.getenv('{}_DB_TYPE'.format(prefix), 'mysql')
                default_port = ''
                config['database.options'] = {
                    'connect_timeout': os.getenv('{}_DB_CONNECT_TIMEOUT'.format(prefix), '20'),
                }
                if pm_type == 'mysql':
                    default_port = '3306'
                    config['database.options']['init_command'] = os.getenv('DB_INIT_CMD',
                                                                           '')
                elif pm_type == 'postgresql':
                    default_port = '5432'
                config['database'] = {
                    'engine': 'django.db.backends.{}'.format(pm_type),
                    'name': os.environ['{}_DB_NAME'.format(prefix)],
                    'user': os.environ['{}_DB_USER'.format(prefix)],
                    'password': os.environ['{}_DB_PASSWORD'.format(prefix)],
                    'host': os.environ['{}_DB_HOST'.format(prefix)],
                    'port': os.getenv('{}_DB_PORT'.format(prefix), default_port),
                }
            except KeyError:
                raise Exception('Not enough variables for connect to  SQL server.')
        else:
            config['database'] = {
                'engine': 'django.db.backends.sqlite3',
                'name': sqlite_db_path
            }

        # Set cache and locks config
        cache_loc = os.getenv('CACHE_LOCATION', '/tmp/{}_django_cache'.format(prefix))
        cache_type = os.getenv('{}_CACHE_TYPE'.format(prefix), 'file')
        if cache_type == 'file':
            cache_engine = 'django.core.cache.backends.filebased.FileBasedCache'
        elif cache_type == 'memcache':  # nocv
            cache_engine = 'django.core.cache.backends.memcached.MemcachedCache'
        elif cache_type == 'redis':  # nocv
            cache_engine = 'django_redis.cache.RedisCache'

        config['cache'] = config['locks'] = {
            'backend': cache_engine,
            'location': cache_loc
        }

        # Set rpc settings
        rpc_connection = os.getenv('RPC_ENGINE', None)
        config['rpc'] = {
            'heartbeat': os.getenv('RPC_HEARTBEAT', '5'),
            'concurrency': os.getenv('RPC_CONCURRENCY', '4'),
            'clone_retry_count': os.getenv('RPC_CLONE_RETRY_COUNT', '3')
        }
        if rpc_connection:  # nocv
            config['rpc']['connection'] = rpc_connection

        # Set web server and API settings
        config['web'] = {
            'session_timeout': os.getenv('{}_SESSION_TIMEOUT'.format(prefix), '2w'),
            'rest_page_limit': os.getenv('{}_WEB_REST_PAGE_LIMIT'.format(prefix), '100'),
            'enable_gravatar': os.getenv('{}_WEB_GRAVATAR'.format(prefix), 'true')
        }

        config['uwsgi'] = {
            'processes': os.getenv('{}_UWSGI_PROCESSES'.format(prefix), '4'),
            'threads': os.getenv('{}_UWSGI_THREADS'.format(prefix), '4'),
            'thread-stacksize': os.getenv('{}_UWSGI_THREADSTACK'.format(prefix), '40960'),
            'max-requests': os.getenv('{}_UWSGI_MAXREQUESTS'.format(prefix), '50000'),
            'limit-as': os.getenv('{}_UWSGI_LIMITS'.format(prefix), '512'),
            'harakiri': os.getenv('{}_UWSGI_HARAKIRI'.format(prefix), '120'),
            'vacuum': os.getenv('{}_UWSGI_VACUUM'.format(prefix), 'true'),
            'pidfile': os.getenv('{}_UWSGI_PIDFILE'.format(prefix), '/run/web.pid'),
            'daemon': 'false'
        }

        # Set worker settings
        config['rpc']['enable_worker'] = 'false'
        if os.environ.get('WORKER', '') == 'ENABLE':  # nocv
            config['rpc']['enable_worker'] = 'true'
            config['worker'] = {
                'loglevel': log_level,
                'logfile': '/tmp/{}_worker.log'.format(prefix.lower()),
                'pidfile': '/run/worker.pid',
                'beat': os.getenv('{}_SCHEDULER_ENABLE'.format(prefix), 'true')
            }

        # Set secret key
        os.environ.setdefault('SECRET_KEY', 'DISABLE')
        if os.environ['SECRET_KEY'] != 'DISABLE':  # nocv
            with open('/etc/{}/secret'.format(prefix.lower()), 'w') as secretfile:
                secretfile.write(os.environ['SECRET_KEY'])

        return config
