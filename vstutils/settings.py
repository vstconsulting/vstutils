import typing as _t
import os
import gc
import pwd
import sys
from tempfile import gettempdir

from django.contrib import admin
from django.utils.functional import lazy
from drf_yasg import errors
import rest_framework
import orjson

from configparserc import config as cconfig
from .tools import get_file_value

from . import __version__ as VSTUTILS_VERSION, __file__ as vstutils_file


SIMPLE_OBJECT_SETTINGS_TYPE = _t.Dict[_t.Text, _t.Dict[_t.Text, _t.Any]]


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

PY_VER: _t.SupportsInt = sys.version_info.major
TMP_DIR: _t.Text = gettempdir() or '/tmp'
BASE_DIR: _t.Text = os.path.dirname(os.path.abspath(vst_lib_module.__file__))
VST_PROJECT_DIR: _t.Text = os.path.dirname(os.path.abspath(vst_project_module.__file__))
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
CONFIG_ENV_DATA_NAME: _t.Text = f"{ENV_NAME}_SETTINGS_DATA"

CONFIG_FILES = (
    CONFIG_FILE + '.yml',
    CONFIG_FILE,
    PROJECT_CONFIG_FILE + '.yml',
    PROJECT_CONFIG_FILE,
    DEV_SETTINGS_FILE + '.yml',
    DEV_SETTINGS_FILE,
)

ConfigBoolType = cconfig.BoolType()
ConfigIntType = cconfig.IntType()
ConfigIntSecondsType = cconfig.IntSecondsType()


class BackendSection(cconfig.Section):

    def key_handler_to_all(self, key):
        return super().key_handler_to_all(key).upper()


class BaseAppendSection(cconfig.AppendSection):
    get: _t.Callable[..., _t.Any]


class MainSection(BaseAppendSection):
    types_map = {
        'debug': ConfigBoolType,
        'enable_admin_panel': ConfigBoolType,
        'allowed_hosts': cconfig.ListType(),
        'first_day_of_week': ConfigIntType,
    }


class WebSection(BaseAppendSection):
    types_map = {
        'allow_cors': ConfigBoolType,
        'session_timeout': ConfigIntSecondsType,
        'page_limit': ConfigIntType,
        'public_openapi': ConfigBoolType,
        'openapi_cache_timeout': ConfigIntType,
        'enable_gravatar': ConfigBoolType,
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
    }


class DBSection(BackendSection):
    types_map = {
        'conn_max_age': ConfigIntSecondsType,
        'atomic_requests': ConfigBoolType,
        'autocommit': ConfigBoolType,
        'disable_server_side_cursors': ConfigBoolType,
    }


class DBTestSection(DBSection):
    type_serialize = ConfigBoolType
    type_create_db = ConfigBoolType
    type_create_user = ConfigBoolType


class DBOptionsSection(cconfig.Section):
    types_map = {
        'timeout': ConfigIntSecondsType,
        'connect_timeout': ConfigIntSecondsType,
        'read_timeout': ConfigIntSecondsType,
        'write_timeout': ConfigIntSecondsType,
        'isolation_level': ConfigIntType,
    }


class CacheSection(BackendSection):
    types_map = {
        'timeout': ConfigIntSecondsType,
    }


class MailSection(BaseAppendSection):
    types_map = {
        'port': ConfigIntType,
        'tls': ConfigBoolType,
        'ssl': ConfigBoolType,
        'send_confirmation': ConfigBoolType,
        'authenticate_after_registration': ConfigBoolType,
    }


class UWSGISection(cconfig.Section):
    type_daemon = ConfigBoolType


class RPCSection(BaseAppendSection):
    type_map = {
        'concurrency"': ConfigIntType,
        'prefetch_multiplier"': ConfigIntType,
        'max_tasks_per_child"': ConfigIntType,
        'heartbeat"': ConfigIntType,
        'results_expiry_days"': ConfigIntType,
        'create_instance_attempts"': ConfigIntType,
        'enable_worker"': ConfigBoolType
    }


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
    type_api_key = cconfig.StrType()
    type_token_hmac_secret_key = cconfig.StrType()
    type_timeout = ConfigIntSecondsType
    type_verify = ConfigBoolType


config: cconfig.ConfigParserC = cconfig.ConfigParserC(
    format_kwargs=KWARGS,
    section_defaults={
        'main': {
            'debug': False,
            'allowed_hosts': ('*',),
            'timezone': 'UTC',
            'first_day_of_week': 0,
            'log_level': 'WARNING',
            'enable_admin_panel': False,
            'ldap-server': None,
            'ldap-default-domain': '',
            'ldap-auth_format': 'cn=<username>,<domain>',
        },
        'web': {
            'allow_cors': False,
            'session_timeout': '2w',
            'static_files_url': '/static/',
            'page_limit': 1000,
            'rest_swagger_description': (vst_project_module.__doc__ or vst_lib_module.__doc__),
            'public_openapi': False,
            'openapi_cache_timeout': 120,
            'enable_gravatar': True,
            'request_max_size': 2621440,
            'x_frame_options': 'SAMEORIGIN',
            'use_x_forwarded_host': False,
            'use_x_forwarded_port': False,
            'password_reset_timeout_days': 1,
            'secure_browser_xss_filter': False,
            'secure_content_type_nosniff': False,
            'secure_hsts_include_subdomains': False,
            'secure_hsts_preload': False,
            'secure_hsts_seconds': 0,
            'health_throttle_rate': 60,
            'bulk_threads': 3,
            'max_tfa_attempts': ConfigIntType(os.getenv(f'{ENV_NAME}_MAX_TFA_ATTEMPTS', 5)),
        },
        'database': {
            'engine': 'django.db.backends.sqlite3',
            'name': '{PROG}/db.{PROG_NAME}.sqlite3',
            'test': {
                'serialize': 'false'
            }
        },
        'cache': {
            "backend": 'django.core.cache.backends.filebased.FileBasedCache',
            'location': '/tmp/{PROG_NAME}_django_cache_{__section}_{PY_VER}',
            'timeout': '10m'
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
            'authenticate_after_registration': os.getenv(f'{ENV_NAME}_AUTHENTICATE_AFTER_REGISTRATION', False),
        },
        'contact': {
            'name': 'System Administrator'
        },
        'uwsgi': {
            'daemon': True
        },
        'rpc': {
            'concurrency': 4,
            'prefetch_multiplier': 1,
            'max_tasks_per_child': 1,
            'heartbeat': 10,
            'results_expiry_days': 1,
            'create_instance_attempts': 10,
            'default_delivery_mode': "persistent",
        },
        'worker': {
            'app': '{PROG_NAME}.wapp:app',
            'loglevel': '{this[main][log_level]}',
            'pidfile': '/run/{PROG_NAME}_worker.pid',
            'autoscale': '{this[rpc][concurrency]},1',
            'hostname': f'{pwd.getpwuid(os.getuid()).pw_name}@%h',
            'beat': True
        },
        'storages': {
            'filesystem': {
                'media_url': '/media/',
                'media_root': os.getenv(f'{ENV_NAME}_MEDIA_ROOT', os.path.join(VST_PROJECT_DIR, "media"))
            }
        }
    },
    section_overload={
        'main': MainSection,
        'web': WebSection,
        'database': DBSection,
        'database.options': DBOptionsSection,
        'database.test': DBTestSection,
        'worker': WorkerSection,
        'cache': CacheSection,
        'locks': CacheSection,
        'session': CacheSection,
        'mail': MailSection,
        'uwsgi': UWSGISection,
        'rpc': RPCSection,
        'centrifugo': CentrifugoSection,
    }
)

config.parse_files(CONFIG_FILES)
config.parse_text(os.getenv(CONFIG_ENV_DATA_NAME, ''))

main: MainSection = config['main']
web: WebSection = config['web']

# Secret file with key for hashing passwords
SECRET_FILE = os.getenv(
    f"{ENV_NAME}_SECRET_FILE",
    f"/etc/{VST_PROJECT_LIB}/secret"
)


def secret_key():
    return get_file_value(
        SECRET_FILE, '*sg17)9wa_e+4$n%7n7r_(kqwlsc^^xdoc3&px$hs)sbz(-ml1'
    )


SECRET_KEY: _t.Text = lazy(secret_key, str)()

# Main settings
##############################################################
# SECURITY WARNING: don't run with debug turned on in production!
TESTS_RUN: bool = any([True for i in sys.argv if i in ['testserver', 'test']])
LOCALRUN: bool = any([True for i in sys.argv if i not in ['collectstatic', 'runserver']]) or TESTS_RUN
TESTSERVER_RUN: bool = 'testserver' in sys.argv
DEBUG: bool = ConfigBoolType(os.getenv('DJANGO_DEBUG', main["debug"]))
ALLOWED_HOSTS: _t.Iterable = main["allowed_hosts"]
SECURE_PROXY_SSL_HEADER: _t.Tuple[_t.Text, _t.Text] = ('HTTP_X_FORWARDED_PROTOCOL', 'https')

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

# :docs:
HAS_DOCS: bool = False
try:
    import docs
    HAS_DOCS = True
except ImportError:  # nocv
    pass

# :websockets:
try:
    import channels
    HAS_CHANNELS: bool = True
except ImportError:  # nocv
    HAS_CHANNELS = False


# Applications definition
##############################################################
INSTALLED_APPS: _t.List[_t.Text] = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
]

if has_django_celery_beat:
    INSTALLED_APPS.append('django_celery_beat')

INSTALLED_APPS += [
    'crispy_forms',
    'rest_framework',
    'rest_framework.authtoken',
    'django_filters',
]

if HAS_DOCS:
    INSTALLED_APPS.append('docs')

INSTALLED_APPS += ['drf_yasg']

if HAS_CHANNELS:
    INSTALLED_APPS.append('channels')

ADDONS: _t.List[_t.Text] = [
    'vstutils',
    'vstutils.api',
]

INSTALLED_APPS += ADDONS

# Additional middleware and auth
##############################################################
MIDDLEWARE: _t.List[_t.Text] = [
    'vstutils.middleware.ExecuteTimeHeadersMiddleware',
    'htmlmin.middleware.HtmlMinifyMiddleware',
    'htmlmin.middleware.MarkRequestMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'vstutils.middleware.LangMiddleware',
    'vstutils.middleware.TwoFaMiddleware',
]

EXCLUDE_FROM_MINIFYING = []

MIDDLEWARE_ENDPOINT_CONTROL = {
    'remove': [
        'corsheaders.middleware.CorsMiddleware',
        'htmlmin.middleware.HtmlMinifyMiddleware',
        'htmlmin.middleware.MarkRequestMiddleware',
        'django.middleware.csrf.CsrfViewMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',
        'vstutils.middleware.LangMiddleware',
        'vstutils.middleware.TwoFaMiddleware',
    ],
    'prepend': [
        'vstutils.api.endpoint.BulkMiddleware'
    ],
    'append': []
}

MAX_TFA_ATTEMPTS: int = web['max_tfa_attempts']

# Allow cross-domain access
CORS_ORIGIN_ALLOW_ALL: bool = web['allow_cors']

LDAP_SERVER: _t.Optional[_t.Text] = main["ldap-server"]
LDAP_DOMAIN: _t.Optional[_t.Text] = main["ldap-default-domain"]
LDAP_FORMAT: _t.Text = main["ldap-auth_format"]

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
            name = list(filter(bool, plugin_name.split('.')))[-1].lower().replace(
                'backend', '')
        plugins[name] = data
    return plugins


AUTH_PLUGINS: SIMPLE_OBJECT_SETTINGS_TYPE = lazy(get_plugins, dict)()

AUTHENTICATION_BACKENDS: _t.List[_t.Text] = [
    'vstutils.auth.AuthPluginsBackend'
]
CACHE_AUTH_USER = main.getboolean('auth-cache-user', fallback=False)

# Sessions settings
# https://docs.djangoproject.com/en/2.2/ref/settings/#sessions
SESSION_COOKIE_AGE: int = web["session_timeout"]
SESSION_ENGINE: _t.Text = 'django.contrib.sessions.backends.cached_db'
SESSION_CACHE_ALIAS: _t.Text = 'session'
SESSION_COOKIE_DOMAIN: _t.Optional[_t.Text] = os.getenv(
    'DJANGO_SESSION_COOKIE_DOMAIN',
    _t.cast(_t.Any, web.get('session_cookie_domain', fallback=None))
)
SESSION_SERIALIZER = 'vstutils.session.YamlSessionSerializer'

CSRF_COOKIE_AGE: int = SESSION_COOKIE_AGE
CSRF_COOKIE_DOMAIN: _t.Optional[_t.Text] = SESSION_COOKIE_DOMAIN
CSRF_TRUSTED_ORIGINS: _t.List = web.getlist('csrf_trusted_origins', fallback=SESSION_COOKIE_DOMAIN)

SECURE_BROWSER_XSS_FILTER = web['secure_browser_xss_filter']
SECURE_CONTENT_TYPE_NOSNIFF = web['secure_content_type_nosniff']
SECURE_HSTS_INCLUDE_SUBDOMAINS = web['secure_hsts_include_subdomains']
SECURE_HSTS_PRELOAD = web['secure_hsts_preload']
SECURE_HSTS_SECONDS = web['secure_hsts_seconds']


# Password validation
# https://docs.djangoproject.com/en/2.2/ref/settings/#auth-password-validators
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
LOGIN_URL: _t.Text = '/login/'
LOGOUT_URL: _t.Text = '/logout/'
LOGIN_REDIRECT_URL: _t.Text = '/'

PASSWORD_RESET_TIMEOUT_DAYS: int = web['password_reset_timeout_days']

# Main controller settings
##############################################################
# Module with urls
ROOT_URLCONF: _t.Text = os.getenv('VST_ROOT_URLCONF', f'{VST_PROJECT}.urls')

# wsgi appilcation settings
WSGI: _t.Text = os.getenv('VST_WSGI', f'{VST_PROJECT}.wsgi')
WSGI_APPLICATION: _t.Text = f"{WSGI}.application"
UWSGI_APPLICATION: _t.Text = f'{WSGI}:application'

ASGI_APPLICATION: _t.Text = "vstutils.ws:application"

uwsgi_settings: cconfig.Section = config['uwsgi']
WEB_DAEMON = uwsgi_settings.getboolean('daemon', fallback=True)
WEB_DAEMON_LOGFILE: _t.Text = uwsgi_settings.get('log_file', fallback='/dev/null')  # type: ignore
WEB_ADDRPORT: _t.Text = uwsgi_settings.get('addrport', fallback=':8080')  # type: ignore

DATA_UPLOAD_MAX_MEMORY_SIZE = web['request_max_size']
X_FRAME_OPTIONS = web['x_frame_options']
USE_X_FORWARDED_HOST = web['use_x_forwarded_host']
USE_X_FORWARDED_PORT = web['use_x_forwarded_port']

if HAS_CHANNELS:
    CHANNEL_LAYERS: SIMPLE_OBJECT_SETTINGS_TYPE = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer"
        }
    }

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
            os.path.join(VSTUTILS_DIR, 'api/templates'),
            os.path.join(VSTUTILS_DIR, 'gui/templates'),
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
# https://docs.djangoproject.com/en/2.2/howto/static-files/
##############################################################
STATIC_URL: _t.Text = web["static_files_url"]
STATIC_FILES_FOLDERS = lazy(lambda: list(filter(bool, (
    os.path.join(VST_PROJECT_DIR, 'static'),
    os.path.join(BASE_DIR, 'static') if BASE_DIR != VST_PROJECT_DIR else None,
    os.path.join(VSTUTILS_DIR, 'static'),
    os.path.join(os.path.dirname(admin.__file__), 'static'),
    os.path.join(os.path.dirname(errors.__file__), 'static'),
    os.path.join(os.path.dirname(rest_framework.__file__), 'static')
))), list)()

if LOCALRUN:
    STATICFILES_DIRS = list(STATIC_FILES_FOLDERS)

STATICFILES_FINDERS: _t.Tuple[_t.Text, _t.Text] = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
)

if not LOCALRUN:
    STATIC_ROOT = os.path.join(VST_PROJECT_DIR, 'static')  # nocv


# Documentation files
# http://django-docs.readthedocs.io/en/latest/#docs-access-optional
##############################################################
DOCS_ROOT: _t.Text = os.path.join(BASE_DIR, 'doc/html')
DOCS_ACCESS: _t.Text = 'public'
DOC_URL: _t.Text = "/docs/"

if HAS_DOCS:
    EXCLUDE_FROM_MINIFYING.append(DOC_URL.lstrip('/'))


# Database settings.
# Read more: https://docs.djangoproject.com/en/2.2/ref/settings/#databases
##############################################################
DATABASES: SIMPLE_OBJECT_SETTINGS_TYPE = {
    'default': config['database'].all()
}

if DATABASES['default'].get('ENGINE', None) == 'django.db.backends.mysql':  # nocv
    try:
        import mysql
    except ImportError:
        try:
            import pymysql
            pymysql.install_as_MySQLdb()
        except ImportError:
            pass

if DATABASES['default'].get('ENGINE', None) == 'django.db.backends.sqlite3':
    try:
        timeout = DATABASES['default']['OPTIONS'].pop('timeout', 20)
        DATABASES['default']['OPTIONS']['timeout'] = timeout
    except:  # nocv
        pass

# Cache settings.
# Read more: https://docs.djangoproject.com/en/2.2/ref/settings/#caches
##############################################################
default_cache = config['cache'].all()
session_cache = config['session'].all() or default_cache
session_cache['TIMEOUT'] = SESSION_COOKIE_AGE

CACHES: SIMPLE_OBJECT_SETTINGS_TYPE = {
    'default': default_cache,
    "locks": config['locks'].all() or default_cache,
    "session": session_cache,
}


# E-Mail settings
# https://docs.djangoproject.com/en/2.2/ref/settings/#email-host
##############################################################
mail = config['mail']
EMAIL_BACKEND: _t.Text = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_PORT = mail["port"]
EMAIL_HOST_USER = mail["user"]
EMAIL_FROM_ADDRESS = mail.get("from_address", EMAIL_HOST_USER)
EMAIL_HOST_PASSWORD = mail["password"]
if mail.get('tls', None) is not None:
    EMAIL_USE_TLS = mail['tls']  # nocv
if mail.get('ssl', None) is not None:
    EMAIL_USE_SSL = mail['ssl']  # nocv
EMAIL_HOST = mail["host"]
if EMAIL_HOST is None:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
SEND_CONFIRMATION_EMAIL: bool = mail["send_confirmation"]
SEND_EMAIL_RETRIES: int = mail['send_email_retries']
SEND_MESSAGE_RETRY_DELAY: int = mail['send_email_retry_delay']
AUTHENTICATE_AFTER_REGISTRATION: bool = mail["authenticate_after_registration"]
REGISTRATION_HASHERS: tuple = mail.getlist(
    'send_confirmation_uid_hashers',
    'django.contrib.auth.hashers.MD5PasswordHasher'
)


# API settings
##############################################################
VST_API_URL: _t.Text = os.getenv("VST_API_URL", "api")
VST_API_VERSION: _t.Text = os.getenv("VST_API_VERSION", r'v1')
API_URL: _t.Text = VST_API_URL
ENDPOINT_VIEW_CLASS: _t.Text = 'vstutils.api.endpoint.EndpointViewSet'
HAS_COREAPI: bool = False
API_CREATE_SWAGGER: bool = web.getboolean('rest_swagger', fallback=('drf_yasg' in INSTALLED_APPS))
SWAGGER_API_DESCRIPTION: _t.Text = web['rest_swagger_description']
TERMS_URL: _t.Text = ''
CONTACT: _t.Dict = config['contact'].all()
OPENAPI_PUBLIC: bool = web['public_openapi']
SCHEMA_CACHE_TIMEOUT = web['openapi_cache_timeout']
HEALTH_THROTTLE_RATE: _t.Text = f"{web['health_throttle_rate']}/minute"
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
    'DEEP_LINKING': True,
    'SECURITY_DEFINITIONS': {
        'basic': {
            'type': 'basic'
        }
    },
}


API: SIMPLE_OBJECT_SETTINGS_TYPE = {
    VST_API_VERSION: {}
}

# deprecated
BULK_OPERATION_TYPES: _t.Dict[_t.Text, _t.Text] = {
    "get": "get",
    "add": "post",
    "set": "patch",
    "del": "delete",
    "mod": "get"
}

HEALTH_BACKEND_CLASS: _t.Text = 'vstutils.api.health.DefaultBackend'

WS_CONSUMERS: SIMPLE_OBJECT_SETTINGS_TYPE = {
    'endpoint': {
        "BACKEND": 'vstutils.ws.builtin.EndpointConsumer'
    }
}

# Rest Api settings
# http://www.django-rest-framework.org/api-guide/settings/
##############################################################
PAGE_LIMIT: int = web["page_limit"]
REST_FRAMEWORK: _t.Dict = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        # 'rest_framework.renderers.JSONRenderer',
        "drf_orjson_renderer.renderers.ORJSONRenderer",
        'rest_framework.renderers.BrowsableAPIRenderer',
        'rest_framework.renderers.MultiPartRenderer',
    ),
    'DEFAULT_PARSER_CLASSES': (
        # 'rest_framework.parsers.JSONParser',
        "drf_orjson_renderer.parsers.ORJSONParser",
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser'
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
    'EXCEPTION_HANDLER': 'vstutils.api.base.exception_handler',
    'DEFAULT_FILTER_BACKENDS': [
        'vstutils.api.filter_backends.DjangoFilterBackend',
        'rest_framework.filters.OrderingFilter',
        'vstutils.api.filter_backends.HideHiddenFilterBackend',
        'vstutils.api.filter_backends.SelectRelatedFilterBackend',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.LimitOffsetPagination',
    'PAGE_SIZE': web.getint("rest_page_limit", fallback=PAGE_LIMIT),
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
    }
}

OPTIMIZE_GET_BY_VALUES = True


# Internationalization
# https://docs.djangoproject.com/en/2.2/topics/i18n/
##############################################################
LANGUAGE_CODE: _t.Text = 'en'

LANGUAGES: _t.Tuple = (
    ('en', 'English'),
    ('ru', 'Russian'),
)

TIME_ZONE: _t.Text = main["timezone"]
USE_I18N: bool = True
USE_L10N: bool = True
USE_TZ: bool = True
FIRST_DAY_OF_WEEK = main['first_day_of_week']


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
        'daphne': default_logger_data,
    }
}

if main.getboolean('enable_django_logs', fallback=False):  # nocv
    LOGGING['loggers']['django'] = default_logger_data

CASE_SENSITIVE_API_FILTER = web.getboolean('case_sensitive_api_filter', fallback=True)

SILENCED_SYSTEM_CHECKS: _t.List = [
    "urls.W005",
    "fields.W122"
]


# Celery broker settings
# Read more: http://docs.celeryproject.org/en/latest/userguide/configuration.html#conf-broker-settings
##############################################################
if RPC_ENABLED:
    rpc: RPCSection = config['rpc']
    __broker_url = rpc.get("connection", fallback="file:///tmp")
    if __broker_url.startswith("file://"):
        __broker_folder = __broker_url.split("://", 1)[1]
        CELERY_BROKER_URL = "filesystem://"
        CELERY_BROKER_TRANSPORT_OPTIONS = {
            "data_folder_in": __broker_folder,
            "data_folder_out": __broker_folder,
            "data_folder_processed": __broker_folder,
        }
        CELERY_RESULT_BACKEND = __broker_url
    else:  # nocv
        CELERY_BROKER_URL = __broker_url
        CELERY_RESULT_BACKEND = rpc.get("result_backend", fallback=CELERY_BROKER_URL)

    CELERY_WORKER_CONCURRENCY = rpc["concurrency"]
    CELERY_WORKER_HIJACK_ROOT_LOGGER = False
    CELERY_TASK_IGNORE_RESULT = True
    CELERYD_PREFETCH_MULTIPLIER = rpc["prefetch_multiplier"]
    CELERYD_MAX_TASKS_PER_CHILD = rpc["max_tasks_per_child"]
    CELERY_BROKER_HEARTBEAT = rpc["heartbeat"]
    CELERY_ACCEPT_CONTENT = ['pickle', 'json']
    CELERY_TASK_SERIALIZER = 'pickle'
    CELERY_RESULT_EXPIRES = rpc["results_expiry_days"]
    CELERY_DEFAULT_DELIVERY_MODE = rpc["default_delivery_mode"]
    CELERY_BEAT_SCHEDULER = 'vstutils.celery_beat_scheduler:SingletonDatabaseScheduler'
    CELERY_TASK_CREATE_MISSING_QUEUES = True
    CELERY_TIMEZONE = TIME_ZONE

    CREATE_INSTANCE_ATTEMPTS = rpc.getint("create_instance_attempts", fallback=10)
    CONCURRENCY = rpc["concurrency"]
    WORKER_QUEUES = ['celery']
    RUN_WORKER = rpc.getboolean('enable_worker', fallback=True)

    if RUN_WORKER:
        WORKER_OPTIONS = config['worker'].all()

# View settings
##############################################################
ENABLE_ADMIN_PANEL = main['enable_admin_panel']
MANIFEST_CLASS = 'vstutils.gui.pwa_manifest.PWAManifest'

VIEWS: SIMPLE_OBJECT_SETTINGS_TYPE = {
    "GUI": {
        "BACKEND": 'vstutils.gui.views.GUIView'
    },
    "MANIFEST": {
        "BACKEND": 'vstutils.gui.views.ManifestView'
    },
    "SERVICE_WORKER": {
        "BACKEND": 'vstutils.gui.views.SWView'
    },
    "OFFLINE": {
        "BACKEND": 'vstutils.gui.views.OfflineView'
    },
    "LOGIN": {
        "BACKEND": 'vstutils.gui.views.Login',
        "OPTIONS": {
            'name': 'login'
        }
    },
    "LOGOUT": {
        "BACKEND": 'vstutils.gui.views.Logout',
        "OPTIONS": {
            'view_args': [{'next_page': '/'}],
            'name': 'logout'
        }
    },
    "PASSWORD_RESET": {
        "BACKEND": 'django.contrib.auth.views.PasswordResetView',
        "OPTIONS": {
            'name': 'password_reset',
            'view_kwargs': {
                'from_email': EMAIL_FROM_ADDRESS
            }
        }
    },
    "PASSWORD_RESET_CONFIRM": {
        "BACKEND": 'django.contrib.auth.views.PasswordResetConfirmView',
        "OPTIONS": {
            'name': 'password_reset_confirm'
        }
    },
    "PASSWORD_RESET_DONE": {
        "BACKEND": 'django.contrib.auth.views.PasswordResetDoneView',
        "OPTIONS": {
            'name': 'password_reset_done'
        }
    },
    "PASSWORD_RESET_COMPLETE": {
        "BACKEND": 'django.contrib.auth.views.PasswordResetCompleteView',
        "OPTIONS": {
            'name': 'password_reset_complete'
        }
    },
    "USER_REGISTRATION": {
        "BACKEND": 'vstutils.gui.views.Registration',
        "OPTIONS": {
            'name': 'user_registration'
        }
    }
}

GUI_VIEWS: _t.Dict[_t.Text, _t.Union[_t.Text, _t.Dict]] = {
    r'^$': 'GUI',
    r'^manifest.json$': 'MANIFEST',
    r'^service-worker.js$': 'SERVICE_WORKER',
    r'^offline.html$': 'OFFLINE',
    'LOGIN_URL': 'LOGIN',
    'LOGOUT_URL': 'LOGOUT',
    r'^password_reset/$': 'PASSWORD_RESET',
    r'^password_reset_done/$': 'PASSWORD_RESET_DONE',
    r'^password_reset_complete/$': 'PASSWORD_RESET_COMPLETE',
    r'^password_reset_confirm/(?P<uidb64>.*)/(?P<token>.*)/$': 'PASSWORD_RESET_CONFIRM',
}

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

SPA_STATIC: _t.List[_t.Dict] = [
    # Load common chunks
    {'priority': 1, 'type': 'js', 'name': 'bundle/vstutils.chunk.js', 'source': 'vstutils'},
    {'priority': 1, 'type': 'js', 'name': 'bundle/base~doc~spa.chunk.js', 'source': 'vstutils'},
    {'priority': 1, 'type': 'js', 'name': 'bundle/base~spa.chunk.js', 'source': 'vstutils'},
    {'priority': 1, 'type': 'js', 'name': 'bundle/vendors~spa.chunk.js', 'source': 'vstutils'},

    # Load app
    {'priority': 2, 'type': 'js', 'name': 'bundle/spa.js', 'source': 'vstutils'},
]

# Centrifugo settings
CENTRIFUGO_CLIENT_KWARGS = config['centrifugo'].all()


# Storage settings
storages = config['storages']
default_storage_class = lazy(
    lambda: (
        'django.core.files.storage.FileSystemStorage'
        if not LIBCLOUD_PROVIDERS.get('default') else
        'storages.backends.apache_libcloud.LibCloudStorage'),
    str
)()

LIBCLOUD_PROVIDERS: _t.Dict[_t.Text, _t.Dict] = {}
MEDIA_ROOT = storages['filesystem']['media_root']
MEDIA_URL = storages['filesystem']['media_url']

if 'libcloud' in storages:

    LIBCLOUD_PROVIDERS = {
        store_name: store_settings
        for store_name, store_settings in storages['libcloud'].all().items()
        if isinstance(store_settings, dict)
    }

    if LIBCLOUD_PROVIDERS and 'default' not in LIBCLOUD_PROVIDERS:
        DEFAULT_LIBCLOUD_PROVIDER = next(iter(LIBCLOUD_PROVIDERS))


DEFAULT_FILE_STORAGE = storages.get('default', fallback=default_storage_class)

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
    DEFAULT_FILE_STORAGE = lazy(lambda: 'inmemorystorage.InMemoryStorage', str)()


if not TESTSERVER_RUN and TESTS_RUN:
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'

# User settings
##############################################################
ENABLE_GRAVATAR: bool = web["enable_gravatar"]
