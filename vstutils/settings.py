import typing as _t
import os
import gc
import pwd
import sys
from hashlib import blake2s
from tempfile import gettempdir

import environ
from django.contrib import admin
from django.utils.functional import lazy
from drf_yasg import errors
import rest_framework
import orjson
import ormsgpack

import configparserc as cconfig
from .tools import get_file_value

from . import __version__, __file__ as vstutils_file


SIMPLE_OBJECT_SETTINGS_TYPE = _t.Dict[_t.Text, _t.Dict[_t.Text, _t.Any]]
VSTUTILS_VERSION = __version__

class Env(dict):
    def __getitem__(self, item):
        if item in self:
            return super().__getitem__(item)
        default = ''
        if ':-' in item:
            item, default = item.split(':-')
        return os.environ.get(item, default)


# MAIN Variables
##############################################################
TESTS_RUN: bool = any([True for i in sys.argv if i in ['testserver', 'test']])
LOCALRUN: bool = any([True for i in sys.argv if i not in ['collectstatic', 'runserver']]) or TESTS_RUN
TESTSERVER_RUN: bool = 'testserver' in sys.argv
interpreter_dir: _t.Text = os.path.dirname(sys.executable or 'python')
PYTHON_INTERPRETER: _t.Text = '/'.join([interpreter_dir, 'python'] if interpreter_dir else 'python')
VSTUTILS_DIR: _t.Text = os.path.dirname(os.path.abspath(vstutils_file))
VST_PROJECT: _t.Text = os.getenv("VST_PROJECT", "vstutils")
VST_PROJECT_LIB_NAME: _t.Text = os.getenv("VST_PROJECT_LIB_NAME", VST_PROJECT)
VST_PROJECT_LIB: _t.Text = os.getenv("VST_PROJECT_LIB", VST_PROJECT_LIB_NAME)
ENV_NAME: _t.Text = os.getenv("VST_PROJECT_ENV", VST_PROJECT_LIB.upper())
vst_project_module = __import__(VST_PROJECT)
vst_lib_module = __import__(VST_PROJECT_LIB_NAME) if VST_PROJECT != VST_PROJECT_LIB else vst_project_module
PROJECT_LIB_VERSION: _t.Text = getattr(vst_lib_module, '__version__', VSTUTILS_VERSION)
PROJECT_VERSION: _t.Text = getattr(vst_project_module, '__version__', PROJECT_LIB_VERSION)
FULL_VERSION: _t.Text = f'{PROJECT_VERSION}_{PROJECT_LIB_VERSION}_{VSTUTILS_VERSION}'
PROJECT_GUI_NAME: _t.Text = os.getenv("VST_PROJECT_GUI_NAME", ENV_NAME[0].upper()+ENV_NAME[1:].lower())
DJANGO_SETTINGS_MODULE: _t.Text = os.getenv("DJANGO_SETTINGS_MODULE")

PY_VER: _t.SupportsInt = sys.version_info.major
TMP_DIR: _t.Text = gettempdir() or '/tmp'  # nosec
BASE_DIR: _t.Text = os.path.dirname(os.path.abspath(vst_lib_module.__file__))  # type: ignore
VST_PROJECT_DIR: _t.Text = os.path.dirname(os.path.abspath(vst_project_module.__file__))  # type: ignore
VST_PROJECT_LIB_DIR: _t.Text = os.path.dirname(os.path.abspath(vst_lib_module.__file__))  # type: ignore
__kwargs: _t.Dict[_t.Text, _t.Any] = dict(
    PY=PY_VER,
    PY_VER='.'.join([str(i) for i in sys.version_info[:2]]),
    INTERPRETER=PYTHON_INTERPRETER,
    TMP=TMP_DIR,
    HOME=BASE_DIR,
    PROG=VST_PROJECT_DIR,
    LIB=BASE_DIR,
    VST=VSTUTILS_DIR,
    PROG_NAME=VST_PROJECT,
    LIB_NAME=VST_PROJECT_LIB_NAME,
    FULL_VERSION=FULL_VERSION,
    ENV=Env()
)
KWARGS: _t.Dict[_t.Text, _t.Any] = __kwargs

# Get settings from config
##############################################################
DEV_SETTINGS_FILE: _t.Text = os.getenv(
    f"{ENV_NAME}_DEV_SETTINGS_FILE",
    os.path.join(BASE_DIR, str(os.getenv("VST_DEV_SETTINGS")))
)
CONFIG_FILE: _t.Text = os.getenv(
    f"{ENV_NAME}_SETTINGS_FILE",
    f"/etc/{VST_PROJECT_LIB}/settings.ini"
)
PROJECT_CONFIG_FILE: _t.Text = os.getenv(
    f"{ENV_NAME}_LIB_SETTINGS_FILE",
    f"/etc/{VST_PROJECT}/settings.ini"
)
PROJECT_LIB_DEFAULTS_CONFIG = os.path.join(VST_PROJECT_LIB_DIR, 'settings.ini')
PROJECT_DEFAULTS_CONFIG = os.path.join(VST_PROJECT_DIR, 'settings.ini')
CONFIG_ENV_DATA_NAME: _t.Text = f"{ENV_NAME}_SETTINGS_DATA"

config_files = (
    PROJECT_LIB_DEFAULTS_CONFIG,
    PROJECT_DEFAULTS_CONFIG if PROJECT_DEFAULTS_CONFIG != PROJECT_LIB_DEFAULTS_CONFIG else None,
    '/etc/vstutils/settings.ini' if VST_PROJECT != 'test_proj' else None,
    '/etc/vstutils/settings.yml' if VST_PROJECT != 'test_proj' else None,
    CONFIG_FILE,
    os.path.splitext(CONFIG_FILE)[0] + '.yml' if CONFIG_FILE else None,
    PROJECT_CONFIG_FILE,
    os.path.splitext(PROJECT_CONFIG_FILE)[0] + '.yml' if PROJECT_CONFIG_FILE else None,
    DEV_SETTINGS_FILE,
    os.path.splitext(DEV_SETTINGS_FILE)[0] + '.yml' if DEV_SETTINGS_FILE else None,
)
if TESTS_RUN:
    config_files = config_files[:2] + config_files[-2:]

CONFIG_FILES: tuple = tuple(filter(bool, config_files))

class BoolOrStringType(cconfig.BaseType):
    def convert(self, value: _t.Any) -> _t.Optional[_t.Union[bool, _t.Text]]:
        if value is None or value == '':  # nocv
            return None
        elif value in ('false', 'False', False):
            return False
        return str(value)  # nocv


class FloatType(cconfig.BaseType):
    def convert(self, value: _t.Any) -> _t.SupportsFloat:
        return float(value)


class LocationsType(cconfig.ListType):
    def convert(self, value: _t.Any) -> _t.Union[_t.Iterable, _t.Text]:
        result: _t.Iterable[_t.Text] = super().convert(value)
        if len(result) > 1:  # type: ignore
            return result
        return value

    def str_convert(self, value):
        if isinstance(value, str):
            return value
        return super().str_convert(value)


ConfigBoolType = cconfig.BoolType()
ConfigIntType = cconfig.IntType()
ConfigFloatType = FloatType()
ConfigIntSecondsType = cconfig.IntSecondsType()
ConfigListType = cconfig.ListType()
ConfigStringType = cconfig.StrType()


class BackendSection(cconfig.Section):
    def key_handler_to_all(self, key):
        return super().key_handler_to_all(key).upper()


class BaseAppendSection(cconfig.AppendSection):
    get: _t.Callable[..., _t.Any]


class MainSection(BaseAppendSection):
    types_map = {
        'debug': ConfigBoolType,
        'enable_admin_panel': ConfigBoolType,
        'enable_registration': ConfigBoolType,
        'allowed_hosts': ConfigListType,
        'first_day_of_week': ConfigIntType,
        'enable_agreement_terms': ConfigBoolType,
        'agreement_terms_path': ConfigStringType,
        'enable_consent_to_processing': ConfigBoolType,
        'consent_to_processing_path': ConfigStringType,
    }


class WebSection(BaseAppendSection):
    types_map = {
        'allow_cors': ConfigBoolType,
        'cors_allow_all_origins': ConfigBoolType,
        'cors_allowed_credentials': ConfigBoolType,
        'cors_allowed_origins': ConfigListType,
        'cors_allowed_origins_regex': ConfigStringType,
        'cors_expose_headers': ConfigListType,
        'cors_allow_methods': ConfigListType,
        'cors_allow_headers': ConfigListType,
        'cors_preflight_max_age': ConfigIntSecondsType,
        'session_timeout': ConfigIntSecondsType,
        'page_limit': ConfigIntType,
        'rest_page_limit': ConfigIntType,
        'openapi_cache_timeout': ConfigIntType,
        'enable_gravatar': ConfigBoolType,
        'gravatar_url': ConfigStringType,
        'rest_swagger': ConfigBoolType,
        'request_max_size': cconfig.BytesSizeType(),
        'x_frame_options': cconfig.StrType(),
        'use_x_forwarded_host': ConfigBoolType,
        'use_x_forwarded_port': ConfigBoolType,
        'password_reset_timeout_days': ConfigIntType,
        'secure_browser_xss_filter': ConfigBoolType,
        'secure_content_type_nosniff': ConfigBoolType,
        'secure_hsts_include_subdomains': ConfigBoolType,
        'secure_hsts_preload': ConfigBoolType,
        'secure_hsts_seconds': ConfigIntSecondsType,
        'health_throttle_rate': ConfigIntType,
        'bulk_threads': ConfigIntType,
        'max_tfa_attempts': ConfigIntType,
        'etag_default_timeout': ConfigIntSecondsType,
        'allow_auto_image_resize': ConfigBoolType,
        'enable_metrics': ConfigBoolType,
    }


class UvicornAsteriskList(cconfig.ListType):
    def convert(self, value: str) -> _t.Union[_t.Iterable, _t.Text]:
        if value == "*":
            return ["0.0.0.0/0", "::/0"]
        return super().convert(value)


class UvicornSection(BaseAppendSection):
    types_map = {
        'ws_max_size': ConfigIntType,
        'ws_ping_interval': ConfigFloatType,
        'ws_ping_timeout': ConfigFloatType,
        'ws_per_message_deflate': ConfigBoolType,
        'access_log': ConfigBoolType,
        'use_colors': ConfigBoolType,
        'reload': ConfigBoolType,
        'reload_dirs': ConfigListType,
        'forwarded_allow_ips': UvicornAsteriskList(),
        'workers': ConfigIntType,
        'proxy_headers': ConfigBoolType,
        'server_header': ConfigBoolType,
        'date_header': ConfigBoolType,
        'limit_concurrency': ConfigIntType,
        'limit_max_requests': ConfigIntType,
        'backlog': cconfig.BytesSizeType(),
        'h11_max_incomplete_event_size': cconfig.BytesSizeType(),
        'timeout_keep_alive': ConfigIntSecondsType,
        'timeout_graceful_shutdown': ConfigIntSecondsType,
        'timeout_notify': ConfigIntSecondsType,
        'factory': ConfigBoolType,
    }


class DatabasesSection(BaseAppendSection):
    types_map = {
        'databases_without_cte_support': ConfigListType,
    }


class DBSection(BackendSection):
    types_map = {
        'conn_max_age': ConfigIntSecondsType,
        'conn_health_checks': ConfigBoolType,
        'atomic_requests': ConfigBoolType,
        'autocommit': ConfigBoolType,
        'disable_server_side_cursors': ConfigBoolType,
    }


class DBTestSection(DBSection):
    type_serialize = ConfigBoolType
    type_create_db = ConfigBoolType
    type_create_user = ConfigBoolType
    type_dependencies = ConfigListType


class DBOptionsSection(cconfig.Section):
    types_map = {
        'timeout': ConfigIntSecondsType,
        'connect_timeout': ConfigIntSecondsType,
        'read_timeout': ConfigIntSecondsType,
        'write_timeout': ConfigIntSecondsType,
        'isolation_level': ConfigIntType,
        'server_side_binding': ConfigBoolType,
    }


class DBOptionsPoolSection(cconfig.Section):
    types_map = {
        'min_size': ConfigIntType,
        'max_size': ConfigIntType,
        'open': ConfigBoolType,
        'timeout': ConfigIntSecondsType,
        'max_waiting': ConfigIntSecondsType,
        'max_lifetime': ConfigIntSecondsType,
        'max_idle': ConfigIntSecondsType,
        'reconnect_timeout': ConfigIntSecondsType,
        'num_workers': ConfigIntType,
    }


class CacheSection(BackendSection):
    types_map = {
        'timeout': ConfigIntSecondsType,
        'location': LocationsType(),
    }


class CacheOptionsSection(BackendSection):
    parent: BaseAppendSection
    types_map = {
        'connect_on_start': ConfigBoolType,
        'binary': ConfigBoolType,
        'no_delay': ConfigBoolType,
        'ignore_exc': ConfigBoolType,
        'ignore_exceptions': ConfigBoolType,
        'socket_keepalive': ConfigBoolType,
        'retry_on_timeout': ConfigBoolType,
        'use_pooling': ConfigBoolType,
        'close_connection': ConfigBoolType,
        'single_connection_client': ConfigBoolType,
        'max_entries': ConfigIntType,
        'cull_frequency': ConfigIntType,
        'max_pool_size': ConfigIntType,
        'pickle_version': ConfigIntType,
        'socket_connect_timeout': ConfigIntSecondsType,
        'socket_timeout': ConfigIntSecondsType,
        'health_check_interval': ConfigIntSecondsType,
    }

    def key_handler_to_all(self, key):
        backend = self.parent['backend']
        if key not in {'max_entries', 'cull_frequency', }:
            return key
        return super(CacheOptionsSection, self).key_handler_to_all(key)


class SentinelsSection(cconfig.Section):
    def all(self) -> _t.List[_t.Tuple[_t.Text, _t.SupportsInt]]:
        return list((k, int(v)) for k, v in super().all().items())


class CachePoolKwargsSection(cconfig.Section):
    types_map = {
        'max_connections': ConfigIntType,
        'retry_on_timeout': ConfigBoolType,
        'skip_full_coverage_check': ConfigBoolType,
        'socket_keepalive': ConfigBoolType,
        'socket_connect_timeout': ConfigIntSecondsType,
        'socket_timeout': ConfigIntSecondsType,
    }


class CacheBehaviorsSection(cconfig.Section):
    types_map = {
        'ketama': ConfigBoolType,
        'no_block': ConfigBoolType,
        'tcp_nodelay': ConfigBoolType,
        'tcp_keepalive': ConfigBoolType,
        'connect_timeout': ConfigIntType,
        'send_timeout': ConfigIntType,
        'receive_timeout': ConfigIntType,
        '_poll_timeout': ConfigIntType,
        'remove_failed': ConfigIntType,
        'retry_timeout': ConfigIntType,
        'dead_timeout': ConfigIntType,
    }


class MailSection(BaseAppendSection):
    types_map = {
        'port': ConfigIntType,
        'tls': ConfigBoolType,
        'ssl': ConfigBoolType,
        'send_confirmation': ConfigBoolType,
        'agreement_terms': ConfigBoolType,
    }


class UWSGISection(cconfig.Section):
    type_daemon = ConfigBoolType


class RPCSection(BaseAppendSection):
    types_map = {
        'concurrency': ConfigIntType,
        'prefetch_multiplier': ConfigIntType,
        'max_tasks_per_child': ConfigIntType,
        'heartbeat': ConfigIntType,
        'results_expiry': ConfigIntSecondsType,
        'create_instance_attempts': ConfigIntType,
        'enable_worker': ConfigBoolType,
        'task_send_sent_event': ConfigBoolType,
        'worker_send_task_events': ConfigBoolType,
    }


class RPCBrokerSection(BaseAppendSection):
    types_map = {
        'visibility_timeout': ConfigIntSecondsType,
        'wait_time_seconds': ConfigIntSecondsType,
        'max_retries': ConfigIntType,
        'polling_interval': FloatType(),
    }

class RPCBrokerPredefinedQueuesSection(cconfig.Section):
    def key_handler_to_all(self, key):
        key = super().key_handler_to_all(key)
        return key.replace('_fifo', '.fifo')


class WorkerSection(BaseAppendSection):
    types_map = {
        'beat': ConfigBoolType,
        'events': ConfigBoolType,
        'task-events': ConfigBoolType,
        'without-gossip': ConfigBoolType,
        'without-mingle': ConfigBoolType,
        'without-heartbeat': ConfigBoolType,
        'purge': ConfigBoolType,
        'discard': ConfigBoolType,
    }


class CentrifugoSection(cconfig.Section):
    type_address = cconfig.StrType()
    type_public_address = cconfig.StrType()
    type_api_key = cconfig.StrType()
    type_token_hmac_secret_key = cconfig.StrType()
    type_timeout = ConfigIntSecondsType
    type_verify = ConfigBoolType


class ThrottleSection(BaseAppendSection):
    types_map = {
        'rate': ConfigStringType,
        'actions': ConfigListType,
    }


class Boto3Subsection(BackendSection):
    types_map = {
        'querystring_auth': ConfigBoolType,
        'querystring_expire': ConfigIntSecondsType,
        'is_gzipped': ConfigBoolType,
        's3_use_ssl': ConfigBoolType,
        's3_secure_urls': ConfigBoolType,
        's3_verify': BoolOrStringType(),
        's3_max_memory_size': ConfigIntType,
        's3_file_overwrite': ConfigBoolType,
        'content_types': ConfigListType,
        'gzip_content_types': ConfigListType,
    }

    def key_handler_to_all(self, key):
        key_uppercase = super().key_handler_to_all(key).upper()
        if key_uppercase != 'GZIP_CONTENT_TYPES':
            return f'AWS_{key_uppercase}'
        return key_uppercase


class WebPushSection(BackendSection):
    types_map = {
        'enabled': ConfigBoolType,
        'vapid_private_key': ConfigStringType,
        'vapid_public_key': ConfigStringType,
        'vapid_admin_email': ConfigStringType,
        'default_notification_icon': ConfigStringType,
    }


class OAuthServerSection(cconfig.Section):
    types_map = {
        'server_url': ConfigStringType,
        'server_token_endpoint_path': ConfigStringType,
        'server_schema_client_id': ConfigStringType,

        'server_enable': ConfigBoolType,
        'server_issuer': ConfigStringType,
        'server_allow_insecure': ConfigBoolType,
        'server_enable_anon_login': ConfigBoolType,
        'server_class': ConfigStringType,
        'server_jwt_alg': ConfigStringType,
        'server_jwt_key': ConfigStringType,
        'server_jwt_extra_claims_provider': ConfigStringType,
        'server_token_expires_in': ConfigIntSecondsType,
        'server_id_token_expires_in': ConfigIntSecondsType,
        'server_client_authentication_methods': ConfigListType,
        'server_authorization_endpoint': ConfigStringType,
        'server_simple_client_id': ConfigStringType,
        'server_simple_client_secret': ConfigStringType,
    }


class DjangoEnv(environ.Env):
    BOOLEAN_TRUE_STRINGS = environ.Env.BOOLEAN_TRUE_STRINGS + ('enable', 'ENABLE')


env = DjangoEnv(
    # set casting, default value
    DEBUG=(bool, False),
    DJANGO_LOG_LEVEL=(str, 'WARNING'),
    TIMEZONE=(str, 'UTC'),
)

config: cconfig.ConfigParserC = cconfig.ConfigParserC(
    format_kwargs=KWARGS,
    section_defaults={
        'main': {
            'debug': env('DEBUG'),
            'allowed_hosts': ('*',),
            'timezone': env('TIMEZONE'),
            'first_day_of_week': env.int(f'{ENV_NAME}_FIRST_DAY_OF_WEEK', default=0),
            'log_level': env('DJANGO_LOG_LEVEL'),
            'enable_admin_panel': env.bool(f'{ENV_NAME}_ENABLE_ADMIN_PANEL', default=False),
            'enable_registration': env.bool(f'{ENV_NAME}_ENABLE_REGISTRATION', default=False),
            'ldap-server': env.str(f'{ENV_NAME}_LDAP_CONNECTION', default=None),
            'ldap-default-domain': env.str(f'{ENV_NAME}_LDAP_DOMAIN', default=''),
            'ldap-auth_format': env.str(f'{ENV_NAME}_LDAP_AUTH_FORMAT', default='cn=<username>,<domain>'),
            'ldap-search-scope': env.str(f'{ENV_NAME}_LDAP_SEARCH_SCOPE', default='ONELEVEL'),
            'language_cookie_name': env.str(f'{ENV_NAME}_LANGUAGE_COOKIE_NAME', default='lang'),
            'agreement_terms_path': env.str(f'{ENV_NAME}_TERMS_PATH', default=f'/etc/{VST_PROJECT_LIB}/terms.md'),
            'consent_to_processing_path': env.str(
                f'{ENV_NAME}_CONSENT_TO_PROCESSING_PATH', default=f'/etc/{VST_PROJECT_LIB}/consent_to_processing.md'
            ),
        },
        'web': {
            'allow_cors': env.bool(f'{ENV_NAME}_WEB_ALLOW_CORS', default=False),
            'cors_allowed_credentials': env.bool(f'{ENV_NAME}_WEB_CORS_ALLOWED_CREDENTIALS', default=False),
            'cors_allowed_origins': env.list(f'{ENV_NAME}_WEB_CORS_ALLOWED_ORIGINS', default=[]),
            'cors_allowed_origins_regex': env.str(f'{ENV_NAME}_WEB_CORS_ALLOWED_ORIGINS_REGEX', default=''),
            'cors_expose_headers': env.list(f'{ENV_NAME}_WEB_CORS_EXPOSE_HEADERS', default=[]),
            'cors_preflight_max_age': env.str(f'{ENV_NAME}_WEB_CORS_PREFLIGHT_MAX_AGE', default='1d'),
            'session_timeout': env.str(f"{ENV_NAME}_SESSION_TIMEOUT", default='2w'),
            'static_files_url': '/static/',
            'page_limit': env.int(f'{ENV_NAME}_WEB_PAGE_LIMIT', default=20),
            'rest_page_limit': env.int(f'{ENV_NAME}_WEB_REST_PAGE_LIMIT', default=1000),
            'rest_swagger_description': (
                    vst_project_module.__doc__ or vst_lib_module.__doc__ or ''
            ).replace('\n', '\\n').replace('\r', '\\r'),
            'openapi_cache_timeout': env.int(f'{ENV_NAME}_WEB_OPENAPI_CACHE_TIMEOUT', default=120),
            'enable_gravatar': env.bool(f'{ENV_NAME}_WEB_ENABLE_GRAVATAR', default=True),
            'gravatar_url': env.str(f'{ENV_NAME}_WEB_GRAVATAR_URL', default=''),
            'request_max_size': env.int(f'{ENV_NAME}_WEB_REQUEST_MAX_SIZE', default=2621440),
            'x_frame_options': 'SAMEORIGIN',
            'use_x_forwarded_host': env.bool(f'{ENV_NAME}_WEB_USE_X_FORWARDED_HOST', default=False),
            'use_x_forwarded_port': env.bool(f'{ENV_NAME}_WEB_USE_X_FORWARDED_PORT', default=False),
            'password_reset_timeout_days': env.int(f'{ENV_NAME}_WEB_PASSWORD_RESET_TIMEOUT_DAYS', default=1),
            'secure_browser_xss_filter': env.bool(f'{ENV_NAME}_WEB_SECURE_BROWSER_XSS_FILTER', default=False),
            'secure_content_type_nosniff': env.bool(f'{ENV_NAME}_WEB_SECURE_CONTENT_TYPE_NOSNIFF', default=False),
            'secure_hsts_include_subdomains': env.bool(f'{ENV_NAME}_WEB_SECURE_HSTS_INCLUDE_SUBDOMAINS', default=False),
            'secure_hsts_preload': env.bool(f'{ENV_NAME}_WEB_SECURE_HSTS_PRELOAD', default=False),
            'secure_hsts_seconds': env.int(f'{ENV_NAME}_WEB_SECURE_HSTS_SECONDS', default=0),
            'health_throttle_rate': env.int(f'{ENV_NAME}_WEB_HEALTH_THROTTLE_RATE', default=60),
            'metrics_throttle_rate': env.int(f'{ENV_NAME}_WEB_METRICS_THROTTLE_RATE', default=120),
            'bulk_threads': 3,
            'max_tfa_attempts': ConfigIntType(os.getenv(f'{ENV_NAME}_MAX_TFA_ATTEMPTS', 5)),
            'etag_default_timeout': ConfigIntSecondsType(os.getenv(f'{ENV_NAME}_ETAG_TIMEOUT', '1d')),
            'allow_auto_image_resize': env.bool(f'{ENV_NAME}_WEB_ALLOW_AUTO_IMAGE_RESIZE', default=True),
            'enable_metrics': env.bool(f'{ENV_NAME}_WEB_ENABLE_METRICS', default=True),
        },
        'database': {
            **env.db(default=f'sqlite:///{KWARGS["PROG"]}/db.{KWARGS["PROG_NAME"]}.sqlite3'),
            'test': {
                'serialize': 'false'
            }
        },
        'databases': {
            "default_db": "default",
            "default_tablespace": "",
            "default_index_tablespace": "",
            "databases_without_cte_support": [],
            'default': {},
        },
        'cache': {
            **env.cache(
                default=f'filecache://{TMP_DIR}/{KWARGS["PROG_NAME"]}_django_cache_default_{KWARGS["PY_VER"]}'
            ),
            'timeout': '10m'
        },
        **{
            cache_name: {
                **env.cache(
                    var=f'{cache_name.upper()}_CACHE_URL',
                    default=f'filecache://{TMP_DIR}/{KWARGS["PROG_NAME"]}_django_cache_{cache_name}_{KWARGS["PY_VER"]}'
                ),
                'timeout': '10m'
            }
            for cache_name in ('locks', 'session', 'etag')
            if f'{cache_name.upper()}_CACHE_URL' in os.environ
        },
        'mail': {
            'port': 25,
            'user': "",
            'password': "",
            'tls': False,
            'host': None,
            'send_confirmation': os.getenv(f'{ENV_NAME}_SEND_CONFIRMATION_EMAIL', False),
            'send_email_retries': os.getenv(f'{ENV_NAME}_SEND_EMAIL_RETRIES', 3),
            'send_email_retry_delay': os.getenv(f'{ENV_NAME}_SEND_EMAIL_RETRY_DELAY', 10),
        },
        'contact': {
            'name': 'System Administrator'
        },
        'uwsgi': {
            'daemon': env.bool(f'{ENV_NAME}_DAEMON', default=True)
        },
        'rpc': {
            'connection': env.str(f'{ENV_NAME}_RPC_ENGINE', default='file:///tmp'),
            'concurrency': env.int(f'{ENV_NAME}_RPC_CONCURRENCY', default=4),
            'prefetch_multiplier': env.int(f'{ENV_NAME}_RPC_PREFETCH_MULTIPLIER', default=1),
            'max_tasks_per_child': env.int(f'{ENV_NAME}_RPC_MAX_TASKS_PER_CHILD', default=1),
            'heartbeat': env.int(f'{ENV_NAME}_RPC_HEARTBEAT', default=10),
            'results_expiry': env.int(f'{ENV_NAME}_RPC_RESULTS_EXPIRY', default=24 * 60 * 60),
            'create_instance_attempts': env.int(f'{ENV_NAME}_RPC_CREATE_INSTANCE_ATTEMPTS', default=10),
            'default_delivery_mode': "persistent",
            'broker_transport_options': {},
            'enable_worker': env.bool(f'{ENV_NAME}_ENABLE_WORKER', default=env.bool('WORKER', default=True)),
            'task_send_sent_event': env.bool(f'{ENV_NAME}_RPC_TASK_SEND_SENT_EVENT', default=True),
            'worker_send_task_events': env.bool(f'{ENV_NAME}_RPC_WORKER_SEND_TASK_EVENTS', default=True),
        },
        'worker': {
            'app': os.getenv('VST_CELERY_APP', '{PROG_NAME}.wapp:app'),
            'loglevel': '{this[main][log_level]}',
            'pidfile': env.str(f'{ENV_NAME}_WORKER_PID', default='/run/{PROG_NAME}_worker.pid'),
            'autoscale': '{this[rpc][concurrency]},1',
            'hostname': f'{pwd.getpwuid(os.getuid()).pw_name}@%h',
            'beat': env.bool(f'{ENV_NAME}_SCHEDULER_ENABLE', default=True),
            'pool': 'prefork'
        },
        'storages': {
            'filesystem': {
                'media_url': '/media/',
                'media_root': os.getenv(f'{ENV_NAME}_MEDIA_ROOT', os.path.join(VST_PROJECT_DIR, "media"))
            }
        },
        'throttle': {
            'rate': os.getenv(f'{ENV_NAME}_GLOBAL_THROTTLE_RATE', ''),
            'actions': ConfigListType(os.getenv(f'{ENV_NAME}_GLOBAL_THROTTLE_ACTIONS', ('update', 'partial_update'))),
            'views': {},
        },
        'uvicorn': {
            'loop': 'auto',
        },
        'oauth': {
            'server_url': '',
            'server_token_endpoint_path': '',
            'server_schema_client_id': '',

            'server_enable': True,
            'server_issuer': '',
            'server_allow_insecure': False,
            'server_class': 'vstutils.oauth2.authorization_server.AuthorizationServer',
            'server_enable_anon_login': False,
            'server_jwt_alg': 'HS256',
            'server_jwt_key': None,
            'server_jwt_extra_claims_provider': '',
            'server_token_expires_in': 864000,
            'server_id_token_expires_in': 3600,
            'server_client_authentication_methods': [
                'same_origin_client_secret_post',
                'client_secret_post',
                'client_secret_basic',
                'none',
            ],
            'server_authorization_endpoint': '',
            'server_simple_client_id': 'simple-client-id',
            'server_simple_client_secret': 'simple-client-secret',
        },
    },
    section_overload={
        'main': MainSection,
        'web': WebSection,
        'databases': DatabasesSection,
        'database': DBSection,
        'database.options': DBOptionsSection,
        'database.options.pool': DBOptionsPoolSection,
        'database.test': DBTestSection,
        'worker': WorkerSection,
        'cache': CacheSection,
        'cache.options': CacheOptionsSection,
        'cache.options.sentinels': SentinelsSection,
        'cache.options.connection_pool_kwargs': CachePoolKwargsSection,
        'cache.options.behaviors': CacheBehaviorsSection,
        'locks': CacheSection,
        'locks.options': CacheOptionsSection,
        'locks.options.sentinels': SentinelsSection,
        'locks.options.connection_pool_kwargs': CachePoolKwargsSection,
        'locks.options.behaviors': CacheBehaviorsSection,
        'session': CacheSection,
        'session.options': CacheOptionsSection,
        'session.options.sentinels': SentinelsSection,
        'session.options.connection_pool_kwargs': CachePoolKwargsSection,
        'session.options.behaviors': CacheBehaviorsSection,
        'etag': CacheSection,
        'etag.options': CacheOptionsSection,
        'etag.options.sentinels': SentinelsSection,
        'etag.options.connection_pool_kwargs': CachePoolKwargsSection,
        'etag.options.behaviors': CacheBehaviorsSection,
        'mail': MailSection,
        'uwsgi': UWSGISection,
        'rpc': RPCSection,
        'rpc.broker_transport_options': RPCBrokerSection,
        'rpc.broker_transport_options.predefined_queues': RPCBrokerPredefinedQueuesSection,
        'centrifugo': CentrifugoSection,
        'throttle': ThrottleSection,
        'storages.boto3': Boto3Subsection,
        'uvicorn': UvicornSection,
        'webpush': WebPushSection,
        'oauth': OAuthServerSection,
    },
    format_exclude_sections=('uwsgi',)
)

config.parse_files(tuple(reversed(CONFIG_FILES)))
config.parse_text(os.getenv(CONFIG_ENV_DATA_NAME, ''))

main: MainSection = config['main']
web: WebSection = config['web']

CONFIG = config

# Secret file with key for hashing passwords
SECRET_FILE = os.getenv(
    f"{ENV_NAME}_SECRET_FILE",
    f"/etc/{VST_PROJECT_LIB}/secret"
)
SECRET_FILE_FALLBACK = os.getenv(
    f"{ENV_NAME}_SECRET_FILE_FALLBACK",
    f"/etc/{VST_PROJECT_LIB}/secret.fallback"
)


def secret_key(secret_file, default='*sg17)9wa_e+4$n%7n7r_(kqwlsc^^xdoc3&px$hs)sbz(-ml1'):
    return get_file_value(secret_file, default)


SECRET_KEY: _t.Text = lazy(secret_key, str)(SECRET_FILE)
SECRET_KEY_FALLBACKS: _t.List[str] = [
    lazy(secret_key, str)(SECRET_FILE_FALLBACK, '3r4Edsgz9PSCSZCe7rRPD6KMkZg23EGK+nknCYjgIh3tkvcjoP27W+dKqtynMpTtwkU=')
]

# Main settings
##############################################################
# SECURITY WARNING: don't run with debug turned on in production!
DEBUG: bool = ConfigBoolType(os.getenv('DJANGO_DEBUG', main["debug"]))
ALLOWED_HOSTS: _t.Iterable = main["allowed_hosts"]
SECURE_PROXY_SSL_HEADER: _t.Tuple[_t.Text, _t.Text] = (
    web.get('secure_proxy_ssl_header_name', fallback='HTTP_X_FORWARDED_PROTOCOL'),
    web.get('secure_proxy_ssl_header_value', fallback='https')
)
ENABLE_ADMIN_PANEL = main['enable_admin_panel']

# Include some addons if packages exists in env
##############################################################
# :django_celery_beat:
has_django_celery_beat = False
try:
    import django_celery_beat
    has_django_celery_beat = True
except ImportError:  # nocv
    pass
RPC_ENABLED: bool = has_django_celery_beat

# Applications definition
##############################################################
INSTALLED_APPS: _t.List[_t.Text] = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'vstutils',
    'django.contrib.staticfiles',
]

if has_django_celery_beat:
    INSTALLED_APPS.append('django_celery_beat')

INSTALLED_APPS += [
    'rest_framework',
    'rest_framework.authtoken',
    'django_filters',
]

INSTALLED_APPS += ['drf_yasg']

ADDONS: _t.List[_t.Text] = [
    'vstutils.api',
]

INSTALLED_APPS += ADDONS

if ENABLE_ADMIN_PANEL:
    INSTALLED_APPS.insert(0, 'django.contrib.admin')


# Additional middleware and auth
##############################################################
MIDDLEWARE: _t.List[_t.Text] = [
    'vstutils.middleware.ExecuteTimeHeadersMiddleware',
    'vstutils.middleware.FrontendChangesNotifications',
    'htmlmin.middleware.HtmlMinifyMiddleware',
    'htmlmin.middleware.MarkRequestMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'vstutils.middleware.LangMiddleware',
]

ADMIN_MIDDLEWARE = [
    'vstutils.middleware.FrontendChangesNotifications',
    'htmlmin.middleware.HtmlMinifyMiddleware',
    'htmlmin.middleware.MarkRequestMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'vstutils.middleware.LangMiddleware',
]

EXCLUDE_FROM_MINIFYING = []

MIDDLEWARE_ENDPOINT_CONTROL = {
    'remove': [
        'vstutils.middleware.FrontendChangesNotifications',
        'htmlmin.middleware.HtmlMinifyMiddleware',
        'htmlmin.middleware.MarkRequestMiddleware',
        'django.middleware.security.SecurityMiddleware',
        'django.contrib.sessions.middleware.SessionMiddleware',
        'django.middleware.common.CommonMiddleware',
        'django.middleware.csrf.CsrfViewMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',
        'vstutils.middleware.LangMiddleware',
    ],
    'prepend': [
        'vstutils.api.endpoint.BulkMiddleware'
    ],
    'append': []
}

MAX_TFA_ATTEMPTS: int = web['max_tfa_attempts']

# Allow cross-domain access
CORS_ORIGIN_ALLOW_ALL: bool = web['allow_cors']
CORS_ALLOWED_ORIGINS: _t.Sequence[str] = web['cors_allowed_origins']
CORS_ALLOWED_CREDENTIALS: bool = web['cors_allowed_credentials']
CORS_ALLOWED_ORIGIN_REGEX: _t.Union[str, _t.Pattern[str]] = web['cors_allowed_origins_regex'] or None
CORS_EXPOSE_HEADERS: _t.Sequence = web['cors_expose_headers']
CORS_PREFLIGHT_MAX_AGE: int = web['cors_preflight_max_age']
if 'cors_allow_methods' in web:
    CORS_ALLOW_METHODS = web['cors_allow_methods']
if 'cors_allow_headers' in web:
    CORS_ALLOW_HEADERS = web['cors_allow_headers']

LDAP_SERVER: _t.Optional[_t.Text] = main["ldap-server"]
LDAP_DOMAIN: _t.Optional[_t.Text] = main["ldap-default-domain"]
LDAP_FORMAT: _t.Text = main["ldap-auth_format"]
LDAP_SEARCH_SCOPE: _t.Text = main["ldap-search-scope"]

DEFAULT_AUTH_PLUGINS: SIMPLE_OBJECT_SETTINGS_TYPE = {
    'LDAP': {
        "BACKEND": "vstutils.auth.LdapBackend"
    },
    'DJANGO': {
        "BACKEND": "django.contrib.auth.backends.ModelBackend"
    },
}

DEFAULT_AUTH_PLUGIN_LIST: _t.Text = 'DJANGO,LDAP'


def get_plugins():
    plugins = {}
    for plugin_name in main.getlist('auth-plugins', fallback=DEFAULT_AUTH_PLUGIN_LIST):
        if plugin_name in DEFAULT_AUTH_PLUGINS:
            data = DEFAULT_AUTH_PLUGINS[plugin_name]
            name = plugin_name
        else:
            data = {"BACKEND": plugin_name}
            name = list(filter(bool, plugin_name.split('.')))[-1].lower().replace('backend', '')
        plugins[name] = data
    return plugins


AUTH_PLUGINS: SIMPLE_OBJECT_SETTINGS_TYPE = lazy(get_plugins, dict)()

AUTHENTICATION_BACKENDS: _t.List[_t.Text] = [
    'vstutils.auth.AuthPluginsBackend'
]
CACHE_AUTH_USER = main.getboolean('auth-cache-user', fallback=False)

# Sessions settings
# https://docs.djangoproject.com/en/3.2/ref/settings/#sessions
SESSION_COOKIE_AGE: int = web["session_timeout"]
SESSION_ENGINE: _t.Text = 'django.contrib.sessions.backends.cached_db'
SESSION_CACHE_ALIAS: _t.Text = 'session'
SESSION_COOKIE_DOMAIN: _t.Optional[_t.Text] = os.getenv(
    'DJANGO_SESSION_COOKIE_DOMAIN',
    _t.cast(_t.Any, web.get('session_cookie_domain', fallback=None))
)
SESSION_SERIALIZER = 'vstutils.session.MsgpackSessionSerializer'

CSRF_COOKIE_AGE: int = SESSION_COOKIE_AGE
CSRF_COOKIE_DOMAIN: _t.Optional[_t.Text] = SESSION_COOKIE_DOMAIN
CSRF_TRUSTED_ORIGINS: _t.List = web.getlist('csrf_trusted_origins', fallback=SESSION_COOKIE_DOMAIN)
CSRF_COOKIE_SECURE: bool = web.getboolean('csrf_cookie_secure', fallback=False)

SECURE_BROWSER_XSS_FILTER = web['secure_browser_xss_filter']
SECURE_CONTENT_TYPE_NOSNIFF = web['secure_content_type_nosniff']
SECURE_HSTS_INCLUDE_SUBDOMAINS = web['secure_hsts_include_subdomains']
SECURE_HSTS_PRELOAD = web['secure_hsts_preload']
SECURE_HSTS_SECONDS = web['secure_hsts_seconds']


# Password validation
# https://docs.djangoproject.com/en/3.2/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS: _t.List[_t.Dict] = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 0,
        },
    },
]
LOGIN_REDIRECT_URL: _t.Text = '/'

PASSWORD_RESET_TIMEOUT_DAYS: int = web['password_reset_timeout_days']

# Main controller settings
##############################################################
# Module with urls
ROOT_URLCONF: _t.Text = os.getenv('VST_ROOT_URLCONF', f'{VST_PROJECT}.urls')

# wsgi appilcation settings
UWSGI_WORKER_PATH: _t.Text = f'{VSTUTILS_DIR}/asgi_worker.py'

ASGI: _t.Text = os.getenv('VST_ASGI', 'vstutils.asgi')
ASGI_APPLICATION: _t.Text = f'{ASGI}.application'

uwsgi_settings: cconfig.Section = config['uwsgi']
WEB_DAEMON = uwsgi_settings.getboolean('daemon', fallback=True)
WEB_DAEMON_LOGFILE: _t.Text = uwsgi_settings.get('log_file', fallback='/dev/null')
WEB_ADDRPORT: _t.Text = uwsgi_settings.get('addrport', fallback=':8080')

DATA_UPLOAD_MAX_MEMORY_SIZE = web['request_max_size']
FILE_UPLOAD_TEMP_DIR = TMP_DIR
X_FRAME_OPTIONS = web['x_frame_options']
USE_X_FORWARDED_HOST = web['use_x_forwarded_host']
USE_X_FORWARDED_PORT = web['use_x_forwarded_port']
WEB_SERVER_HEADERS: _t.List[_t.Tuple[str, str]] = []


# Templates settings
##############################################################
TEMPLATES: _t.List[_t.Dict] = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(VST_PROJECT_DIR, 'api/templates'),
            os.path.join(VST_PROJECT_DIR, 'gui/templates'),
            os.path.join(VST_PROJECT_DIR, 'templates'),
            os.path.join(BASE_DIR, 'api/templates'),
            os.path.join(BASE_DIR, 'gui/templates'),
            os.path.join(BASE_DIR, 'templates'),
            os.path.join(VSTUTILS_DIR, 'templates'),
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'vstutils.gui.context.settings_constants',
                'vstutils.gui.context.project_args',
                'vstutils.gui.context.pwa_context',
                'vstutils.gui.context.headers_context',
            ],
            'builtins': [
                'vstutils.templatetags.translation',
            ]
        },
    },
]


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.2/howto/static-files/
##############################################################
STATIC_URL: _t.Text = web["static_files_url"]

PROJECT_STATIC_DIRS = lazy(lambda: list(filter(bool, (
    os.path.join(VST_PROJECT_DIR, 'static'),
    os.path.join(BASE_DIR, 'static') if BASE_DIR != VST_PROJECT_DIR else None,
    os.path.join(VSTUTILS_DIR, 'static'),
))), tuple)()
STATIC_FILES_FOLDERS = lazy(lambda: list(filter(bool, (
    *PROJECT_STATIC_DIRS,
    os.path.join(os.path.dirname(admin.__file__), 'static'),
    os.path.join(os.path.dirname(errors.__file__), 'static'),
    os.path.join(os.path.dirname(rest_framework.__file__), 'static')
))), list)()

STATICFILES_DIRS = list(STATIC_FILES_FOLDERS)

STATICFILES_FINDERS: _t.Tuple[_t.Text, _t.Text] = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
)

# Documentation files
# http://django-docs.readthedocs.io/en/latest/#docs-access-optional
##############################################################
DOCS_ROOT: _t.Text = os.path.join(BASE_DIR, 'doc/html')
DOC_URL: _t.Text = "/docs/"

# :docs:
HAS_DOCS: bool = os.path.exists(DOCS_ROOT)

if HAS_DOCS:
    EXCLUDE_FROM_MINIFYING.append(DOC_URL.lstrip('/'))


# Database settings.
# Read more: https://docs.djangoproject.com/en/3.2/ref/settings/#databases
##############################################################
DATABASES: SIMPLE_OBJECT_SETTINGS_TYPE


def parse_db(params):
    db_name, param_data = params
    data: DBSection = config.get_section_instance('database')
    db_url_env = f'{db_name.upper().replace("-", "_")}_{env.DEFAULT_DATABASE_ENV}'
    default_data_from_env = (
        env.db_url(db_url_env, default='')
        if db_url_env in os.environ
        else {}
    )
    data.update({
        **config['database'].all(),
        **default_data_from_env,
        **param_data.all()
    })
    data_all: _t.Dict[_t.Text, _t.Union[_t.Optional[_t.Text], _t.Dict]] = data.all()
    USED_ENGINES.add(_t.cast(str, data_all.get('ENGINE')))
    return db_name, data_all


USED_ENGINES: _t.Set[_t.Text] = set()
DATABASES = dict(map(parse_db, filter(lambda x: isinstance(x[1], cconfig.Section), config['databases'].items())))

if 'django.db.backends.mysql' in USED_ENGINES:  # nocv
    try:
        import mysql
    except ImportError:
        try:
            import pymysql
            pymysql.install_as_MySQLdb()
        except ImportError:
            pass

for db in filter(lambda x: x.get('ENGINE', None) == 'django.db.backends.sqlite3', DATABASES.values()):
    try:
        db['OPTIONS'].setdefault('timeout', 20)
    except Exception:  # nocv
        pass

DEFAULT_AUTO_FIELD = 'django.db.models.AutoField'
DEFAULT_TABLESPACE = config['databases'].get('default_tablespace', fallback='')
DEFAULT_INDEX_TABLESPACE = config['databases'].get('default_index_tablespace', fallback='')
DATABASES_WITHOUT_CTE_SUPPORT = config['databases'].get('databases_without_cte_support', fallback='')
# Cache settings.
# Read more: https://docs.djangoproject.com/en/3.2/ref/settings/#caches
##############################################################
default_cache = config['cache'].all()
session_cache = config['session'].all() or config['cache'].all()
session_cache['TIMEOUT'] = SESSION_COOKIE_AGE
etag_cache = config['etag'].all() or config['cache'].all()
etag_cache['TIMEOUT'] = web['etag_default_timeout']

CACHES: SIMPLE_OBJECT_SETTINGS_TYPE = {
    'default': default_cache,
    "locks": config['locks'].all() or default_cache,
    "session": session_cache,
    "etag": etag_cache,
}


# E-Mail settings
# https://docs.djangoproject.com/en/3.2/ref/settings/#email-host
##############################################################
mail = config['mail']
EMAIL_HOST_USER = mail["user"]

if 'EMAIL_URL' in os.environ:
    vars().update(env.email('EMAIL_URL'))  # nocv
else:
    EMAIL_BACKEND: _t.Text = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_PORT = mail["port"]
    EMAIL_HOST_PASSWORD = mail["password"]
    if mail.get('tls', None) is not None:
        EMAIL_USE_TLS = mail['tls']  # nocv
    if mail.get('ssl', None) is not None:
        EMAIL_USE_SSL = mail['ssl']  # nocv
    EMAIL_HOST = mail["host"]
    if EMAIL_HOST is None:
        EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

EMAIL_FROM_ADDRESS = mail.get("from_address", EMAIL_HOST_USER)

SEND_CONFIRMATION_EMAIL: bool = mail["send_confirmation"]
SEND_EMAIL_RETRIES: int = mail['send_email_retries']
SEND_MESSAGE_RETRY_DELAY: int = mail['send_email_retry_delay']
REGISTRATION_HASHERS: tuple = mail.getlist(
    'send_confirmation_uid_hashers',
    'django.contrib.auth.hashers.MD5PasswordHasher'
)

EMAIL_CONFIRMATION_MESSAGE: _t.Text = (
    'Please confirm your {application_name} account by verifying your email address. '
    'Simply click the link below, and you activate your account.'
)

# API settings
##############################################################
VST_API_URL: _t.Text = os.getenv("VST_API_URL", "api")
VST_API_VERSION: _t.Text = os.getenv("VST_API_VERSION", r'v1')
API_URL: _t.Text = VST_API_URL
ENDPOINT_VIEW_CLASS: _t.Text = 'vstutils.api.endpoint.EndpointViewSet'
HAS_COREAPI: bool = False
API_CREATE_SWAGGER: bool = web.getboolean('rest_swagger', fallback=('drf_yasg' in INSTALLED_APPS))
SWAGGER_API_DESCRIPTION: _t.Text = web['rest_swagger_description'].replace('\\n', '\n').replace('\\r', '\r')
TERMS_URL: _t.Text = ''
CONTACT: _t.Dict = config['contact'].all()
SCHEMA_CACHE_TIMEOUT = web['openapi_cache_timeout']
HEALTH_THROTTLE_RATE: _t.Text = f"{web['health_throttle_rate']}/minute"
METRICS_THROTTLE_RATE: _t.Text = f"{web['metrics_throttle_rate']}/minute"
OPENAPI_VIEW_CLASS: _t.Text = 'vstutils.api.schema.views.OpenApiView'
BULK_THREADS = web['bulk_threads']

OPENAPI_EXTRA_LINKS: SIMPLE_OBJECT_SETTINGS_TYPE = {
    'vstutils': {
        'url': 'https://github.com/vstconsulting/vstutils.git',
        'name': 'VST Utils sources'
    }
}

SWAGGER_SETTINGS: _t.Dict = {
    'DEFAULT_INFO': 'vstutils.api.schema.info.api_info',
    'DEFAULT_AUTO_SCHEMA_CLASS': 'vstutils.api.schema.schema.VSTAutoSchema',
    'DEFAULT_GENERATOR_CLASS': 'vstutils.api.schema.generators.VSTSchemaGenerator',
    'DEFAULT_SPEC_RENDERERS': [
        'drf_yasg.renderers.SwaggerYAMLRenderer',
        'vstutils.api.schema.renderers.SwaggerJSONRenderer',
        'vstutils.api.schema.renderers.OpenAPIRenderer',
    ],
    'DEEP_LINKING': True,
    'USE_SESSION_AUTH': False,
    'REFETCH_SCHEMA_WITH_AUTH': True,
    'REFETCH_SCHEMA_ON_LOGOUT': True,
    'SECURITY_DEFINITIONS': {},
}


API: SIMPLE_OBJECT_SETTINGS_TYPE = {
    VST_API_VERSION: {},
    'oauth2': {},
}

HEALTH_BACKEND_CLASS: _t.Text = 'vstutils.api.health.DefaultBackend'
METRICS_BACKEND_CLASS: _t.Text = web.get('metrics_backend', fallback='vstutils.api.metrics.DefaultBackend')
ENABLE_METRICS_VIEW: bool = web['enable_metrics']

# Rest Api settings
# http://www.django-rest-framework.org/api-guide/settings/
##############################################################
PAGE_LIMIT: int = web["page_limit"]
REST_FRAMEWORK: _t.Dict = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'vstutils.oauth2.authentication.JWTBearerTokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        "vstutils.api.renderers.ORJSONRenderer",
        "vstutils.api.renderers.MsgpackRenderer",
    ),
    'DEFAULT_PARSER_CLASSES': (
        "drf_orjson_renderer.parsers.ORJSONParser",
        "vstutils.api.parsers.MsgpackParser",
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'vstutils.api.permissions.IsAuthenticatedOpenApiRequest'
    ],
    "ORJSON_RENDERER_OPTIONS": (
        orjson.OPT_NON_STR_KEYS,
        orjson.OPT_SERIALIZE_DATACLASS,
        orjson.OPT_SERIALIZE_NUMPY,
        orjson.OPT_SERIALIZE_UUID,
    ),
    "MSGPACK_RENDERER_OPTIONS": (
        ormsgpack.OPT_NON_STR_KEYS,
        ormsgpack.OPT_SERIALIZE_NUMPY,
        ormsgpack.OPT_NAIVE_UTC,
    ),
    'EXCEPTION_HANDLER': 'vstutils.api.base.exception_handler',
    'DEFAULT_FILTER_BACKENDS': [
        'vstutils.api.filter_backends.DjangoFilterBackend',
        'vstutils.api.filter_backends.OrderingFilterBackend',
        'vstutils.api.filter_backends.HideHiddenFilterBackend',
        'vstutils.api.filter_backends.SelectRelatedFilterBackend',
        'rest_framework.filters.SearchFilter',
    ],
    'SEARCH_PARAM': '__search',
    'DEFAULT_PAGINATION_CLASS': 'vstutils.api.pagination.LimitOffsetPagination',
    'PAGE_SIZE': web["rest_page_limit"],
    'DEFAULT_SCHEMA_CLASS': 'vstutils.api.base.AutoSchema',
    'DEFAULT_METADATA_CLASS': 'vstutils.api.meta.VSTMetadata',
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.NamespaceVersioning',
    'SCHEMA_COERCE_PATH_PK': False,
    'SCHEMA_COERCE_METHOD_NAMES': {
        'create': 'add',
        'list': 'list',
        'retrieve': 'get',
        'update': 'update',
        'partial_update': 'edit',
        'destroy': 'remove',
    },
    'DEFAULT_THROTTLE_CLASSES': (
        'vstutils.api.throttling.ActionBasedThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'oauth2': '50/hour',
        'registration': '50/hour',
        'password_reset': '50/hour',
    },
}

OPTIMIZE_GET_BY_VALUES = True


# Internationalization
# https://docs.djangoproject.com/en/3.2/topics/i18n/
##############################################################
LANGUAGE_CODE: _t.Text = 'en'

LANGUAGES: _t.Tuple = (
    ('en', 'English'),
    ('ru', 'Русский'),
    ('cn', '简体中文'),
    ('vi', 'Tiếng Việt'),
)

TIME_ZONE: _t.Text = main["timezone"]
USE_I18N: bool = True
USE_L10N: bool = True
USE_TZ: bool = True
FIRST_DAY_OF_WEEK = main['first_day_of_week']
LANGUAGE_COOKIE_NAME = main['language_cookie_name']


# LOGGING settings
##############################################################
LOG_LEVEL: _t.Text = os.getenv('DJANGO_LOG_LEVEL', main["log_level"])
LOG_LEVEL = os.getenv(f'{VST_PROJECT_LIB.upper()}_LOG_LEVEL', LOG_LEVEL).upper()
LOG_FORMAT: _t.Text = "[%(asctime)s] %(levelname)s [%(name)s.%(funcName)s:%(lineno)d] %(message)s"
LOG_DATE_FORMAT: _t.Text = "%d/%b/%Y %H:%M:%S"

default_logger_data = {
    'handlers': ['console', 'file'],
    'level': LOG_LEVEL,
    'propagate': True,
}

LOGGING: _t.Dict = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': LOG_FORMAT,
            'datefmt': LOG_DATE_FORMAT
        },
    },
    'handlers': {
        'console': {
            'level': LOG_LEVEL,
            'formatter': 'standard',
            'class': 'logging.StreamHandler',
            'stream': sys.stdout,
        },
        'file': {
            'level': LOG_LEVEL,
            'class': 'logging.FileHandler',
            'filename': WEB_DAEMON_LOGFILE
        } if WEB_DAEMON_LOGFILE != '/dev/null' else {'class': 'logging.NullHandler', 'level': LOG_LEVEL},
    },
    'loggers': {
        VST_PROJECT_LIB: default_logger_data,
        VST_PROJECT_LIB_NAME: default_logger_data,
        VST_PROJECT: default_logger_data,
        'vstutils': default_logger_data,
        'drf_yasg.generators': default_logger_data,
        'authlib': default_logger_data,
    }
}

if main.getboolean('enable_django_logs', fallback=False):  # nocv
    LOGGING['loggers']['django'] = default_logger_data

CASE_SENSITIVE_API_FILTER = web.getboolean('case_sensitive_api_filter', fallback=True)

SILENCED_SYSTEM_CHECKS: _t.List = [
    "urls.W005",
    "fields.W122",
    "staticfiles.W004",
    "admin.E408",
    "admin.E409",
    "admin.E410",
]


# Celery broker settings
# Read more: http://docs.celeryproject.org/en/latest/userguide/configuration.html#conf-broker-settings
##############################################################
if RPC_ENABLED:
    rpc: RPCSection = config['rpc']
    CELERY_BROKER_TRANSPORT_OPTIONS: _t.Dict = rpc['broker_transport_options'].all()
    __broker_url = rpc.get("connection", fallback="file:///tmp")
    if __broker_url.startswith("file://"):
        __broker_folder = __broker_url.split("://", 1)[1]
        CELERY_BROKER_URL = "filesystem://"
        CELERY_BROKER_TRANSPORT_OPTIONS.update({
            "data_folder_in": __broker_folder,
            "data_folder_out": __broker_folder,
            "data_folder_processed": __broker_folder,
            "control_folder": os.path.join(__broker_folder, f'celery_control'),
        })
        CELERY_RESULT_BACKEND = __broker_url
    else:  # nocv
        CELERY_BROKER_URL = __broker_url
        CELERY_RESULT_BACKEND = env.str(
            f'{ENV_NAME}_RPC_RESULT_BACKEND',
            rpc.get("result_backend", fallback=CELERY_BROKER_URL)
        )

    CELERY_WORKER_CONCURRENCY = rpc["concurrency"]
    CELERY_WORKER_HIJACK_ROOT_LOGGER = False
    CELERY_TASK_IGNORE_RESULT = True
    CELERYD_PREFETCH_MULTIPLIER = rpc["prefetch_multiplier"]
    CELERYD_MAX_TASKS_PER_CHILD = rpc["max_tasks_per_child"]
    CELERY_BROKER_HEARTBEAT = rpc["heartbeat"]
    CELERY_ACCEPT_CONTENT = ['pickle', 'json', 'msgpack']
    CELERY_TASK_SERIALIZER = 'msgpack'
    CELERY_RESULT_EXPIRES = rpc["results_expiry"]
    CELERY_SEND_SENT_EVENT = rpc["task_send_sent_event"]
    CELERY_SEND_EVENTS = rpc["worker_send_task_events"]
    CELERY_DEFAULT_DELIVERY_MODE = rpc["default_delivery_mode"]
    CELERY_BEAT_SCHEDULER = 'vstutils.celery_beat_scheduler:SingletonDatabaseScheduler'
    CELERY_TASK_CREATE_MISSING_QUEUES = True
    CELERY_TIMEZONE = TIME_ZONE

    CREATE_INSTANCE_ATTEMPTS = rpc.getint("create_instance_attempts", fallback=10)
    CONCURRENCY = rpc["concurrency"]
    WORKER_QUEUES = ['celery']
    RUN_WORKER = rpc['enable_worker']

    WORKER_OPTIONS = config['worker'].all()

# View settings
##############################################################
MANIFEST_CLASS = 'vstutils.gui.pwa_manifest.PWAManifest'
ENABLE_BACKEND_MANIFEST = True

VIEWS: SIMPLE_OBJECT_SETTINGS_TYPE = {
    "SERVICE_WORKER": {
        "BACKEND": 'vstutils.gui.views.SWView',
        "OPTIONS": {
            'name': 'service_worker'
        }
    },
    "OFFLINE": {
        "BACKEND": 'vstutils.gui.views.OfflineView',
        "OPTIONS": {
            'name': 'offline_gui'
        }
    },
    "TERMS": {
        "BACKEND": 'vstutils.gui.views.TermsView',
        "OPTIONS": {
            'name': 'terms'
        }
    },
    "CONSENT_TO_PROCESSING": {
        "BACKEND": 'vstutils.gui.views.ConsentToProcessingView',
        "OPTIONS": {
            'name': 'consent_to_processing'
        }
    }
}

GUI_VIEWS: _t.Dict[_t.Text, _t.Union[_t.Text, _t.Dict]] = {
    'service-worker.js': 'SERVICE_WORKER',
    'offline.html': 'OFFLINE',
}

def get_accounts_views_mapping():
    mapping = {}
    if ENABLE_AGREEMENT_TERMS and AGREEMENT_TEMRS_URL:
        mapping[AGREEMENT_TEMRS_URL] = 'TERMS'

    if ENABLE_CONSENT_TO_PROCESSING and CONSENT_TO_PROCESSING_URL:
        mapping[CONSENT_TO_PROCESSING_URL] = 'CONSENT_TO_PROCESSING'

    return mapping


URLS = lazy(lambda: {**GUI_VIEWS}, dict)()
ACCOUNT_URLS = lazy(get_accounts_views_mapping, dict)()
ACCOUNT_URL = 'account/'

AGREEMENT_TEMRS_URL = 'terms/'
ENABLE_AGREEMENT_TERMS: bool = main.getboolean('enable_agreement_terms', fallback=False)
AGREEMENT_TERMS_PATH: str = main['agreement_terms_path']

CONSENT_TO_PROCESSING_URL = 'consent_to_processing/'
ENABLE_CONSENT_TO_PROCESSING: bool = main.getboolean('enable_consent_to_processing', fallback=False)
CONSENT_TO_PROCESSING_PATH: str = main['consent_to_processing_path']

ENABLE_USER_SELF_REMOVE: bool = main.getboolean('enable_user_self_remove', fallback=False)


PROJECT_GUI_MENU: _t.List[_t.Dict] = [
    {
        'name': 'System',
        'span_class': 'fa fa-cog',
        'sublinks': [
            {
                'name': 'Users',
                'url': '/user',
                'span_class': 'fa fa-user',
            },
        ]
    },
]

SPA_STATIC: _t.List[_t.Dict] = []

# Centrifugo settings
CENTRIFUGO_CLIENT_KWARGS = config['centrifugo'].all()
CENTRIFUGO_PUBLIC_HOST = CENTRIFUGO_CLIENT_KWARGS.pop('public_address', None) or CENTRIFUGO_CLIENT_KWARGS.get('address')
NOTIFICATOR_CLIENT_CLASS = web.get(
    'notificator_client_class',
    fallback='vstutils.models.cent_notify.Notificator'
)
SUBSCRIPTIONS_PREFIX = CENTRIFUGO_CLIENT_KWARGS.pop('subscriptions_prefix', f'{VST_PROJECT_LIB}.update')

THROTTLE = config['throttle'].all()


# Storage settings
def get_default_storage_class():
    if LIBCLOUD_PROVIDERS.get('default'):
        return 'storages.backends.apache_libcloud.LibCloudStorage'  # nocv
    elif all([i in globals() for i in ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_STORAGE_BUCKET_NAME']]):
        return 'storages.backends.s3.S3Storage'

    return 'django.core.files.storage.FileSystemStorage'  # nocv


storages = config['storages']
LIBCLOUD_PROVIDERS: _t.Dict[_t.Text, _t.Dict] = {}
MEDIA_ROOT = storages['filesystem']['media_root']
MEDIA_URL = storages['filesystem']['media_url']
STORAGES = {
    'filesystem': {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

if 'libcloud' in storages:

    LIBCLOUD_PROVIDERS = {
        store_name: store_settings
        for store_name, store_settings in storages['libcloud'].all().items()
        if isinstance(store_settings, dict)
    }

    if LIBCLOUD_PROVIDERS and 'default' not in LIBCLOUD_PROVIDERS:
        DEFAULT_LIBCLOUD_PROVIDER = next(iter(LIBCLOUD_PROVIDERS))

    STORAGES['libcloud'] = {"BACKEND": 'storages.backends.apache_libcloud.LibCloudStorage'}

if 'boto3' in storages:
    globals().update( storages['boto3'].all())
    STORAGES['s3'] = {"BACKEND": 'storages.backends.s3.S3Storage'}


STORAGES['default'] = {
    "BACKEND": get_default_storage_class()
}

DOCKERRUN_MIGRATE_LOCK_ID = config['docker'].get('migrate_lock_id', VST_PROJECT_LIB_NAME)

DOCKERRUN_MIGRATE_LOCK_TIMEOUT = config['docker'].getint('migrate_lock_timeout', 15)

API_ONLY = False

# Default auth views
##############################################################
DEFAULT_REGISTRATION_VIEW_ENABLE: bool = True
DEFAULT_REGISTRATION_VIEW_SERIALIZER_CLASS: str = 'vstutils.api.registration.serializers.UserRegistrationSerializer'
DEFAULT_REGISTRATION_VIEW_CONFIRMATION_LINK: str = '/#/auth/registration/confirm-email/{code}'

DEFAULT_PASSWORD_RESET_VIEW_ENABLE: bool = True
DEFAULT_PASSWORD_RESET_VIEW_CONFIRMATION_LINK: str = '/#/auth/password-reset/{uid}/{token}'


# WebPush settings
##############################################################
webpush_section = config['webpush']
WEBPUSH_ENABLED: bool = webpush_section.get('enabled', False)
WEBPUSH_PRIVATE_KEY: _t.Optional[str] = webpush_section.get('vapid_private_key', None)
WEBPUSH_PUBLIC_KEY: _t.Optional[str] = webpush_section.get('vapid_public_key', None)
WEBPUSH_SUB_EMAIL: _t.Optional[str] = webpush_section.get('vapid_admin_email', None)
WEBPUSH_DEFAULT_NOTIFICATIONS_ICON: _t.Optional[str] = webpush_section.get('default_notification_icon', None)
WEBPUSH_CREATE_USER_SETTINGS_VIEW = WEBPUSH_ENABLED
WEBPUSH_USER_SETTINGS_VIEW_SUBPATH = 'push_notifications'


# OAuth
##############################################################
class OauthServerClientConfig(_t.TypedDict):
    allowed_grant_types: list[
        _t.Literal[
            'authorization_code',
            'implicit',
            'client_credentials',
            'password',
            'refresh_token',
        ]
    ]
    secret: _t.Optional[str]
    allowed_redirect_uris: _t.Optional[list[str]]
    allowed_response_types: _t.Optional[
        list[
            _t.Literal[
                'code id_token token',
                'code id_token',
                'code token',
                'code',
                'id_token token',
                'id_token',
                'token',
            ]
        ]
    ]
    token_endpoint_auth_methods: _t.Optional[
        list[
            _t.Literal[
                'same_origin_client_secret_post',
                'client_secret_post',
                'client_secret_basic',
                'none',
            ]
        ]
    ]
    default_redirect_uri: _t.Optional[str]

OauthServerClientsConfig = dict[str, OauthServerClientConfig]

OAUTH_SERVER_URL: str = config['oauth']['server_url']
OAUTH_SERVER_TOKEN_ENDPOINT_PATH: str = config['oauth']['server_token_endpoint_path']
OAUTH_SERVER_SCHEMA_CLIENT_ID: str = (
    config['oauth']['server_schema_client_id'] or
    config['oauth']['server_simple_client_id']
)

OAUTH_SERVER_ENABLE: bool = config['oauth']['server_enable']
OAUTH_SERVER_ISSUER: str = (
    env.str(f'{ENV_NAME}_OAUTH_SERVER_ISSUER', None) or
    config['oauth']['server_issuer'] or
    VST_PROJECT
)
OAUTH_SERVER_CLASS: str = config['oauth']['server_class']
OAUTH_SERVER_ENABLE_ANON_LOGIN: bool = config['oauth']['server_enable_anon_login']
OAUTH_SERVER_PASSWORD_GRANT_ADDITIONAL_EXTENSIONS: list[str] = []
OAUTH_SERVER_AUTHORIZATION_CODE_GRANT_ADDITIONAL_EXTENSIONS: list[str] = []
OAUTH_SERVER_JWT_ALG: str = config['oauth']['server_jwt_alg']
OAUTH_SERVER_JWT_KEY: str = (
    env.str(f'{ENV_NAME}_OAUTH_SERVER_JWT_KEY', None)
    or config['oauth'].get('server_jwt_key', fallback=None)
)
OAUTH_SERVER_JWT_KEY = OAUTH_SERVER_JWT_KEY or blake2s(SECRET_KEY.encode()).hexdigest()
OAUTH_SERVER_JWT_EXTRA_CLAIMS_PROVIDER: _t.Optional[str] = config['oauth']['server_jwt_extra_claims_provider']
OAUTH_SERVER_TOKEN_EXPIRES_IN: int = config['oauth']['server_token_expires_in']
OAUTH_SERVER_ID_TOKEN_EXPIRES_IN: int = config['oauth']['server_id_token_expires_in']
OAUTH_SERVER_CLIENT_AUTHENTICATION_METHODS: list[str] = config['oauth']['server_client_authentication_methods']
OAUTH_SERVER_AUTHORIZATION_ENDPOINT: _t.Optional[str] = config['oauth']['server_authorization_endpoint']
OAUTH_SERVER_AUTHORIZATION_CODE_CACHE_NAME: str = 'session'
OAUTH_SERVER_CLIENTS: OauthServerClientsConfig = {
    config['oauth']['server_simple_client_id']: {
        'token_endpoint_auth_methods': [
            'same_origin_client_secret_post',
        ],
        'allowed_grant_types': ['password', 'refresh_token'],
        'secret': None,
        'allowed_redirect_uris': None,
        'allowed_response_types': None,
        'default_redirect_uri': None,
    }
}
OAUTH_SERVER_USER_WRAPPER = 'vstutils.oauth2.user.UserWrapper'

if OAUTH_SERVER_ENABLE:
    if config['oauth']['server_allow_insecure']:
        os.environ['AUTHLIB_INSECURE_TRANSPORT'] = '1'

    if OAUTH_SERVER_ENABLE_ANON_LOGIN:
        AUTHENTICATION_BACKENDS.append(
            'vstutils.oauth2.anonymous.AnonymousUserAuthBackend',
        )

    API['oauth2'].update({
        'token': {
            'view': 'vstutils.oauth2.endpoints.TokenViewSet',
            'type': 'view',
        },
        'revoke': {
            'view': 'vstutils.oauth2.endpoints.RevokeTokenViewSet',
            'type': 'view',
        },
        'userinfo': {
            'view': 'vstutils.oauth2.endpoints.UserInfoView',
            'type': 'view',
        },
        'introspect': {
            'view': 'vstutils.oauth2.endpoints.TokenIntrospectionViewSet',
            'type': 'view',
        },
    })

# Test settings for speedup tests
##############################################################
if TESTS_RUN:
    gc.disable()
    gc.set_threshold(0)
    CELERY_TASK_ALWAYS_EAGER = True
    EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher', ]
    REGISTRATION_HASHERS = ('django.contrib.auth.hashers.MD5PasswordHasher',)
    CONTACT = dict(
        some_extra_url='https://pypi.org/project/vstutils/', **CONTACT
    )
    CELERY_RESULT_BACKEND = 'cache'
    CELERY_CACHE_BACKEND = 'memory'
    CACHES = {
        name: {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}
        for name in CACHES
    }
    BULK_THREADS = 10
    SEND_EMAIL_RETRIES = 10
    for storage_name in filter('staticfiles'.__ne__, STORAGES):
        STORAGES[storage_name] = {"BACKEND": 'django.core.files.storage.InMemoryStorage'}
    CENTRIFUGO_CLIENT_KWARGS = {}
    OAUTH_SERVER_TOKEN_EXPIRES_IN = 60 * 60
    try:
        __import__('pysqlite3')
        sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')  # nocv
    except ImportError:  # nocv
        pass


if not TESTSERVER_RUN and TESTS_RUN:
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'

# User settings
##############################################################
ENABLE_GRAVATAR: bool = web["enable_gravatar"]
GRAVATAR_URL: bool = web["gravatar_url"]

# Auto resize image settings
##############################################################
ALLOW_AUTO_IMAGE_RESIZE = web['allow_auto_image_resize']
