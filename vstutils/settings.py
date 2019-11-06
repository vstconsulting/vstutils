import os
import gc
import pwd
import sys
from collections import OrderedDict

from django.contrib import admin
from django.utils.functional import lazy
from drf_yasg import errors
import rest_framework

try:
    from .tools import get_file_value
except ImportError:
    import pyximport
    pyximport.install(
        language_level=3,
        setup_args={'include_dirs': [
            '/'.join([os.path.dirname(os.path.dirname(__file__)), 'include']),
            '/'.join([os.path.dirname(__file__), 'include']),
        ]}
    )
    from .tools import get_file_value

from . import config as cconfig
from . import __version__ as VSTUTILS_VERSION, __file__ as vstutils_file

# MAIN Variables
##############################################################
interpreter_dir = os.path.dirname(sys.executable or 'python')
PYTHON_INTERPRETER = '/'.join([interpreter_dir, 'python'] if interpreter_dir else 'python')
VSTUTILS_DIR = os.path.dirname(os.path.abspath(vstutils_file))
VST_PROJECT = os.getenv("VST_PROJECT", "vstutils")
VST_PROJECT_LIB_NAME = os.getenv("VST_PROJECT_LIB_NAME", VST_PROJECT)
VST_PROJECT_LIB = os.getenv("VST_PROJECT_LIB", VST_PROJECT_LIB_NAME)
ENV_NAME = os.getenv("VST_PROJECT_ENV", VST_PROJECT_LIB.upper())
vst_project_module = __import__(VST_PROJECT)
vst_lib_module = __import__(VST_PROJECT_LIB_NAME) if VST_PROJECT != VST_PROJECT_LIB else vst_project_module
PROJECT_LIB_VERSION = getattr(vst_lib_module, '__version__', VSTUTILS_VERSION)
PROJECT_VERSION = getattr(vst_project_module, '__version__', PROJECT_LIB_VERSION)
PROJECT_GUI_NAME = os.getenv("VST_PROJECT_GUI_NAME", ENV_NAME[0].upper()+ENV_NAME[1:].lower())

PY_VER = sys.version_info.major
TMP_DIR = "/tmp"
BASE_DIR = os.path.dirname(os.path.abspath(vst_lib_module.__file__))
VST_PROJECT_DIR = os.path.dirname(os.path.abspath(vst_project_module.__file__))
__kwargs = dict(
    PY=PY_VER, PY_VER='.'.join([str(i) for i in sys.version_info[:2]]),
    INTERPRETER=PYTHON_INTERPRETER, TMP=TMP_DIR, HOME=BASE_DIR,
    PROG=VST_PROJECT_DIR, LIB=BASE_DIR, VST=VSTUTILS_DIR,
    PROG_NAME=VST_PROJECT, LIB_NAME=VST_PROJECT_LIB_NAME
)
KWARGS = __kwargs

# Get settings from config
##############################################################
DEV_SETTINGS_FILE = os.getenv("{}_DEV_SETTINGS_FILE".format(ENV_NAME),
                              os.path.join(BASE_DIR, str(os.getenv("VST_DEV_SETTINGS"))))
CONFIG_FILE = os.getenv(
    "{}_SETTINGS_FILE".format(ENV_NAME),
    "/etc/{}/settings.ini".format(VST_PROJECT_LIB)
)
CONFIG_ENV_DATA_NAME = "{}_SETTINGS_DATA".format(ENV_NAME)


class BackendSection(cconfig.Section):

    def key_handler_to_all(self, key):
        return super().key_handler_to_all(key).upper()


class BaseAppendSection(cconfig.Section):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for key, value in self.get_default_data().items():
            if key not in self:
                self[key] = value


class MainSection(BaseAppendSection):
    types_map = {
        'debug': cconfig.BoolType(),
        'enable_admin_panel': cconfig.BoolType(),
        'allowed_hosts': cconfig.ListType(),
    }


class WebSection(BaseAppendSection):
    types_map = {
        'allow_cors': cconfig.BoolType(),
        'session_timeout': cconfig.IntSecondsType(),
        'page_limit': cconfig.IntType(),
        'public_openapi': cconfig.BoolType(),
        'openapi_cache_timeout': cconfig.IntType(),
        'enable_gravatar': cconfig.BoolType(),
        'rest_swagger': cconfig.BoolType()
    }


class DBSection(BackendSection):
    types_map = {
        'conn_max_age': cconfig.IntSecondsType(),
        'atomic_requests': cconfig.BoolType(),
        'autocommit': cconfig.BoolType(),
    }


class DBTestSection(BackendSection):
    type_serialize = cconfig.BoolType()


class DBOptionsSection(cconfig.Section):
    types_map = {
        'timeout': cconfig.IntSecondsType(),
        'connect_timeout': cconfig.IntSecondsType(),
        'read_timeout': cconfig.IntSecondsType(),
        'write_timeout': cconfig.IntSecondsType(),
    }


class CacheSection(BackendSection):
    types_map = {
        'timeout': cconfig.IntSecondsType(),
    }


class MailSection(BaseAppendSection):
    types_map = {
        'port': cconfig.IntType(),
        'tls': cconfig.BoolType(),
    }


class UWSGISection(cconfig.Section):
    type_daemon = cconfig.BoolType()


class RPCSection(BaseAppendSection):
    type_map = {
        'concurrency"': cconfig.IntType(),
        'prefetch_multiplier"': cconfig.IntType(),
        'max_tasks_per_child"': cconfig.IntType(),
        'heartbeat"': cconfig.IntType(),
        'results_expiry_days"': cconfig.IntType(),
        'create_instance_attempts"': cconfig.IntType(),
        'enable_worker"': cconfig.BoolType()
    }


class WorkerSection(BaseAppendSection):
    types_map = {
        'beat': cconfig.BoolType(),
        'events': cconfig.BoolType(),
        'task-events': cconfig.BoolType(),
        'without-gossip': cconfig.BoolType(),
        'without-mingle': cconfig.BoolType(),
        'without-heartbeat': cconfig.BoolType(),
        'purge': cconfig.BoolType(),
        'discard': cconfig.BoolType(),
    }


config = cconfig.ConfigParserC(
    format_kwargs=KWARGS,
    section_defaults={
        'main': {
            'debug': False,
            'allowed_hosts': ('*',),
            'timezone': 'UTC',
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
            'enable_gravatar': True
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
            'host': None
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
        },
        'worker': {
            'app': '{PROG_NAME}.wapp:app',
            'loglevel': '{this[main][log_level]}',
            'logfile': '/var/log/{PROG_NAME}/worker.log',
            'pidfile': '/run/{PROG_NAME}_worker.pid',
            'autoscale': '{this[rpc][concurrency]},1',
            'hostname': '{}@%h'.format(pwd.getpwuid(os.getuid()).pw_name),
            'beat': True
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
    }
)
config.parse_files([CONFIG_FILE, DEV_SETTINGS_FILE])
config.parse_text(os.getenv(CONFIG_ENV_DATA_NAME, ''))

main = config['main']
web = config['web']

# Secret file with key for hashing passwords
SECRET_FILE = os.getenv(
    "{}_SECRET_FILE".format(ENV_NAME), "/etc/{}/secret".format(VST_PROJECT_LIB)
)

def secret_key():
    return get_file_value(
        SECRET_FILE, '*sg17)9wa_e+4$n%7n7r_(kqwlsc^^xdoc3&px$hs)sbz(-ml1'
    )

SECRET_KEY = lazy(secret_key, str)()

# Main settings
##############################################################
# SECURITY WARNING: don't run with debug turned on in production!
TESTS_RUN = any([True for i in sys.argv if i in ['testserver', 'test']])
LOCALRUN = any([True for i in sys.argv if i not in ['collectstatic', 'runserver']]) or TESTS_RUN
TESTSERVER_RUN = 'testserver' in sys.argv
DEBUG = os.getenv('DJANGO_DEBUG', main["debug"])
ALLOWED_HOSTS = main["allowed_hosts"]
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTOCOL', 'https')

# Include some addons if packages exists in env
##############################################################
# :django_celery_beat:
has_django_celery_beat = False
try:
    import django_celery_beat
    has_django_celery_beat = True
except ImportError:  # nocv
    pass
RPC_ENABLED = has_django_celery_beat

# :docs:
HAS_DOCS = False
try:
    import docs
    HAS_DOCS = True
except ImportError:  # nocv
    pass

# Applications definition
##############################################################
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
]
INSTALLED_APPS += ['django_celery_beat'] if has_django_celery_beat else []
INSTALLED_APPS += [
    'crispy_forms',
    'rest_framework',
    'rest_framework.authtoken',
    'django_filters',
]
INSTALLED_APPS += ['docs'] if HAS_DOCS else []
INSTALLED_APPS += ['drf_yasg']

ADDONS = ['vstutils', ]

INSTALLED_APPS += ADDONS

# Additional middleware and auth
##############################################################
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'vstutils.middleware.TimezoneHeadersMiddleware',
    'vstutils.middleware.ExecuteTimeHeadersMiddleware',
]
# Fix for django 1.8-9
MIDDLEWARE_CLASSES = MIDDLEWARE

# Allow cross-domain access
CORS_ORIGIN_ALLOW_ALL = web['allow_cors']

LDAP_SERVER = main["ldap-server"]
LDAP_DOMAIN = main["ldap-default-domain"]
LDAP_FORMAT = main["ldap-auth_format"]

DEFAULT_AUTH_PLUGINS = {
    'LDAP': {
        "BACKEND": "vstutils.auth.LdapBackend"
    }
}

DEFAULT_AUTH_PLUGIN_LIST = 'LDAP'

def get_plugins():
    plugins = OrderedDict()
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

AUTH_PLUGINS = lazy(get_plugins, OrderedDict)()

AUTHENTICATION_BACKENDS = [
    'vstutils.auth.AuthPluginsBackend',
    'django.contrib.auth.backends.ModelBackend'
]

# Sessions settings
# https://docs.djangoproject.com/en/1.11/ref/settings/#sessions
SESSION_COOKIE_AGE = web["session_timeout"]
SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'
SESSION_CACHE_ALIAS = 'session'


# Password validation
# https://docs.djangoproject.com/en/1.10/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
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
LOGIN_URL = '/login/'
LOGOUT_URL = '/logout/'
LOGIN_REDIRECT_URL = '/'


# Main controller settings
##############################################################
# Module with urls
ROOT_URLCONF = os.getenv('VST_ROOT_URLCONF', '{}.urls'.format(VST_PROJECT))

# wsgi appilcation settings
WSGI = os.getenv('VST_WSGI', '{}.wsgi'.format(VST_PROJECT))
WSGI_APPLICATION = "{}.application".format(WSGI)
UWSGI_APPLICATION = '{module}:{app}'.format(
    module='.'.join(WSGI_APPLICATION.split('.')[:-1]), app=WSGI_APPLICATION.split('.')[-1]
)

uwsgi_settings = config['uwsgi']
WEB_DAEMON = uwsgi_settings.getboolean('daemon', fallback=True)
WEB_DAEMON_LOGFILE = uwsgi_settings.get('log_file', fallback='/dev/null')
WEB_ADDRPORT = uwsgi_settings.get('addrport', fallback=':8080')

# Templates settings
##############################################################
TEMPLATES = [
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
        },
    },
]


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.10/howto/static-files/
##############################################################
STATIC_URL = web["static_files_url"]
STATIC_FILES_FOLDERS = list()
STATIC_FILES_FOLDERS.append(os.path.join(VST_PROJECT_DIR, 'static'))
if BASE_DIR != VST_PROJECT_DIR:  # nocv
    STATIC_FILES_FOLDERS.append(os.path.join(BASE_DIR, 'static'))
STATIC_FILES_FOLDERS.append(os.path.join(VSTUTILS_DIR, 'static'))
STATIC_FILES_FOLDERS.append(os.path.join(os.path.dirname(admin.__file__), 'static'))
STATIC_FILES_FOLDERS.append(os.path.join(os.path.dirname(errors.__file__), 'static'))
STATIC_FILES_FOLDERS.append(os.path.join(os.path.dirname(rest_framework.__file__), 'static'))
if LOCALRUN:
    STATICFILES_DIRS = STATIC_FILES_FOLDERS

STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
)

if not LOCALRUN:
    STATIC_ROOT = os.path.join(VST_PROJECT_DIR, 'static')  # nocv


# Documentation files
# http://django-docs.readthedocs.io/en/latest/#docs-access-optional
##############################################################
DOCS_ROOT = os.path.join(BASE_DIR, 'doc/html')
DOCS_ACCESS = 'public'
DOC_URL = "/docs/"


# Database settings.
# Read more: https://docs.djangoproject.com/en/1.11/ref/settings/#databases
##############################################################
DATABASES = {
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
# Read more: https://docs.djangoproject.com/en/1.11/ref/settings/#caches
##############################################################
default_cache = config['cache'].all()
session_cache = config['session'].all() or default_cache
session_cache['TIMEOUT'] = SESSION_COOKIE_AGE

CACHES = {
    'default': default_cache,
    "locks": config['locks'].all() or default_cache,
    "session": session_cache,
}


# E-Mail settings
# https://docs.djangoproject.com/en/1.10/ref/settings/#email-host
##############################################################
mail = config['mail']
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_PORT = mail["port"]
EMAIL_HOST_USER = mail["user"]
EMAIL_HOST_PASSWORD = mail["password"]
EMAIL_USE_TLS = mail["tls"]
EMAIL_HOST = mail["host"]
if EMAIL_HOST is None:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'


# Rest Api settings
# http://www.django-rest-framework.org/api-guide/settings/
##############################################################
PAGE_LIMIT = web["page_limit"]
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
        'rest_framework.renderers.MultiPartRenderer',
    ),
    'EXCEPTION_HANDLER': 'vstutils.api.base.exception_handler',
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.OrderingFilter',
        'vstutils.api.filter_backends.HideHiddenFilterBackend',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.LimitOffsetPagination',
    'PAGE_SIZE': web.getint("rest_page_limit", fallback=PAGE_LIMIT),
    'DEFAULT_SCHEMA_CLASS': 'vstutils.api.base.AutoSchema',
    'DEFAULT_METADATA_CLASS': 'vstutils.api.meta.VSTMetadata',
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

# API settings
##############################################################
VST_API_URL = os.getenv("VST_API_URL", "api")
VST_API_VERSION = os.getenv("VST_API_VERSION", r'v1')
API_URL = VST_API_URL
HAS_COREAPI = False
API_CREATE_SWAGGER = web.getboolean('rest_swagger', fallback=('drf_yasg' in INSTALLED_APPS))
SWAGGER_API_DESCRIPTION = web['rest_swagger_description']
TERMS_URL = ''
CONTACT = config['contact'].all()
OPENAPI_PUBLIC = web['public_openapi']
SCHEMA_CACHE_TIMEOUT = web['openapi_cache_timeout']

OPENAPI_EXTRA_LINKS = {
    'vstutils': {
        'url': 'https://github.com/vstconsulting/vstutils.git',
        'name': 'VST Utils sources'
    }
}

SWAGGER_SETTINGS = {
    'DEFAULT_INFO': 'vstutils.api.swagger.api_info',
    'DEFAULT_AUTO_SCHEMA_CLASS': 'vstutils.api.schema.VSTAutoSchema',
    'DEFAULT_GENERATOR_CLASS': 'vstutils.api.schema.VSTSchemaGenerator',
    # 'DEFAULT_API_URL': 'http://localhost:8080/',
    'DEEP_LINKING': True,
    'SECURITY_DEFINITIONS': {
        'basic': {
            'type': 'basic'
        }
    },
}

# Hardcoded because GUI based on OpenAPI
API_CREATE_SCHEMA = True

API = {
    VST_API_VERSION: {
        r'user': {
            'view': 'vstutils.api.views.UserViewSet'
        },
        r'_bulk': {
            'view': 'vstutils.api.views.BulkViewSet', 'type': 'view', "name": "_bulk"
        },
    }
}

BULK_OPERATION_TYPES = {
    "get": "get",
    "add": "post",
    "set": "patch",
    "del": "delete",
    "mod": "get"
}

HEALTH_BACKEND_CLASS = 'vstutils.api.health.DefaultBackend'

# Internationalization
# https://docs.djangoproject.com/en/1.10/topics/i18n/
##############################################################
LANGUAGE_CODE = 'en'

LANGUAGES = (
    ('ru', 'Russian'),
    ('en', 'English'),
)

TIME_ZONE = main["timezone"]
USE_I18N = True
USE_L10N = True
USE_TZ = True


# LOGGING settings
##############################################################
LOG_LEVEL = os.getenv('DJANGO_LOG_LEVEL', main["log_level"]).upper()
LOG_FORMAT = "[%(asctime)s] %(levelname)s [%(name)s.%(funcName)s:%(lineno)d] %(message)s"
LOG_DATE_FORMAT = "%d/%b/%Y %H:%M:%S"

LOGGING = {
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
        },
    },
    'loggers': {
        VST_PROJECT_LIB: {
            'handlers': ['console', 'file'],
            'level': LOG_LEVEL,
            'propagate': True,
        },
        VST_PROJECT_LIB_NAME: {
            'handlers': ['console', 'file'],
            'level': LOG_LEVEL,
            'propagate': True,
        },
        VST_PROJECT: {
            'handlers': ['console', 'file'],
            'level': LOG_LEVEL,
            'propagate': True,
        },
        'vstutils': {
            'handlers': ['console', 'file'],
            'level': LOG_LEVEL,
            'propagate': True,
        },
        'drf_yasg.generators': {
            'handlers': ['console', 'file'],
            'level': LOG_LEVEL,
            'propagate': True,
        },
    }
}
SILENCED_SYSTEM_CHECKS = [
    'fields.W342', 'urls.W001', '1_10.W001', "fields.W340", "urls.W005"
]


# Celery broker settings
# Read more: http://docs.celeryproject.org/en/latest/userguide/configuration.html#conf-broker-settings
##############################################################
rpc = config['rpc']
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
CELERY_BEAT_SCHEDULER = 'vstutils.celery_beat_scheduler:SingletonDatabaseScheduler'
CELERY_TASK_CREATE_MISSING_QUEUES = True
CELERY_TIMEZONE = TIME_ZONE

CREATE_INSTANCE_ATTEMPTS = rpc.getint("create_instance_attempts", fallback=10)
CONCURRENCY = rpc["concurrency"]
WORKER_QUEUES = ['celery']
RUN_WORKER = rpc.getboolean('enable_worker', fallback=has_django_celery_beat)


if RUN_WORKER:
    WORKER_OPTIONS = config['worker'].all() if has_django_celery_beat else {}

# View settings
##############################################################
ENABLE_ADMIN_PANEL = main['enable_admin_panel']
MANIFEST_CLASS = 'vstutils.gui.pwa_manifest.PWAManifest'

VIEWS = {
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
            'view_args': [{'next_page': '/'}]
        }
    },
    "PASSWORD_RESET": {
        "BACKEND": 'django.contrib.auth.views.PasswordResetView',
        "OPTIONS": {
            'name': 'password_reset'
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

GUI_VIEWS = {
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

PROJECT_GUI_MENU = [
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

SPA_STATIC = [
    {'priority': 0, 'type': 'js', 'name': 'admin/js/vendor/jquery/jquery.min.js', 'spa': True, 'api': False},
    {'priority': 1, 'type': 'js', 'name': 'js/libs/tabSignal.js', 'spa': True, 'api': False},
    {'priority': 3, 'type': 'js', 'name': 'js/libs/md5.min.js', 'spa': True, 'api': True},
    {'priority': 4, 'type': 'js', 'name': 'js/libs/touchwipe.js', 'spa': True, 'api': True},
    {'priority': 4, 'type': 'js', 'name': 'js/libs/visibility/visibility.core.js', 'spa': True, 'api': True},
    {'priority': 4, 'type': 'js', 'name': 'js/libs/iziToast.min.js', 'spa': True, 'api': True},
    {'priority': 4, 'type': 'js', 'name': 'js/libs/iziModal.min.js', 'spa': True, 'api': True},
    {'priority': 4, 'type': 'js', 'name': 'js/libs/imask.js', 'spa': True, 'api': True},
    {'priority': 9, 'type': 'js', 'name': 'js/guiCustomizer.js', 'spa': True, 'api': True},
    {'priority': 4, 'type': 'js', 'name': 'plugins/fastclick/fastclick.min.js', 'spa': True, 'api': True},
    {'priority': 11.5, 'type': 'js', 'name':'js/libs/xregexp-all.js', 'spa': True, 'api': True},
    {'priority': 9, 'type': 'js', 'name': 'AdminLTE-3.0.0/min/js/adminlte.min.js', 'spa': True, 'api': True},
    {'priority': 8, 'type': 'js', 'name': 'js/common-utils.js', 'spa': True, 'api': True},
    {'priority': 110, 'type': 'js', 'name': 'js/libs/autocomplete.js', 'spa': True, 'api': True},
    {'priority': 110, 'type': 'js', 'name': 'plugins/select2/select2.full.min.js', 'spa': True, 'api': True},
    {'priority': 50, 'type': 'js', 'name': 'js/libs/moment.min.js', 'spa': True, 'api': True},
    {'priority': 51, 'type': 'js', 'name': 'js/libs/moment-timezone.min.js', 'spa': True, 'api': True},
    {'priority': 51, 'type': 'js', 'name': 'js/libs/Chart.min.js', 'spa': True, 'api': True},
    {'priority': 50, 'type': 'js', 'name': 'js/libs/jquery.scrollTo.min.js', 'spa': True, 'api': True},
    {'priority': 9, 'type': 'js', 'name': 'js/libs/axios.min.js', 'spa': True, 'api': True},
    {'priority': 9, 'type': 'js', 'name': 'js/libs/vue/vue.min.js', 'spa': True, 'api': True},
    {'priority': 9.1, 'type': 'js', 'name': 'js/libs/vue/vuex.min.js', 'spa': True, 'api': True},
    {'priority': 9.2, 'type': 'js', 'name': 'js/libs/vue/vue-router.min.js', 'spa': True, 'api': True},
    {'priority': 300, 'type': 'tpl', 'name': 'templates/guiFields.html', 'spa': True, 'api': True},
    {'priority': 300, 'type': 'tpl', 'name': 'templates/guiItems.html', 'spa': True, 'api': True},
    {'priority': 9.8, 'type': 'js', 'name': 'js/guiPopUp.js', 'spa': True, 'api': True},
    {'priority': 9.9, 'type': 'js', 'name': 'js/guiFieldsMixins.js', 'spa': True, 'api': True},
    {'priority': 10, 'type': 'js', 'name': 'js/guiFields.js', 'spa': True, 'api': True},
    {'priority': 10.1, 'type': 'js', 'name': 'js/guiItems.js', 'spa': True, 'api': True},
    {'priority': 10.2, 'type': 'js', 'name': 'js/guiModels.js', 'spa': True, 'api': False},
    {'priority': 10.3, 'type': 'js', 'name': 'js/guiQuerySet.js', 'spa': True, 'api': False},
    {'priority': 10.4, 'type': 'js', 'name': 'js/guiViews.js', 'spa': True, 'api': False},
    {'priority': 10.5, 'type': 'js', 'name': 'js/guiStore.js', 'spa': True, 'api': False},
    {'priority': 10.6, 'type': 'js', 'name': 'js/guiRouter.js', 'spa': True, 'api': False},
    {'priority': 10.7, 'type': 'js', 'name': 'js/guiApi.js', 'spa': True, 'api': True},
    {'priority': 10.9, 'type': 'js', 'name': 'js/guiApp.js', 'spa': True, 'api': False},
    {'priority': 10.9, 'type': 'js', 'name': 'js/guiAppForApi.js', 'spa': False, 'api': True},
    {'priority': 11, 'type': 'js', 'name': 'js/guiUsers.js', 'spa': True, 'api': True},
    {'priority': 300, 'type': 'js', 'name': 'js/guiDashboard.js', 'spa': True, 'api': False},
    {'priority': 102, 'type': 'css', 'name': 'css/iziToast.min.css', 'spa': True, 'api': True},
    {'priority': 102, 'type': 'css', 'name': 'css/iziModal.min.css', 'spa': True, 'api': True},
    {'priority': 105, 'type': 'css', 'name': 'AdminLTE-3.0.0/min/css/adminlte.min.css', 'spa': True, 'api': True},
    {'priority': 108, 'type': 'css', 'name': 'css/gui.css', 'spa': True, 'api': True},
    {'priority': 99, 'type': 'css', 'name': 'plugins/select2/select2.min.css', 'spa': True, 'api': True},
    {
        'priority': 4, 'type': 'js', 'name': 'AdminLTE-3.0.0/plugins/bootstrap/js/bootstrap.bundle.min.js',
        'spa': True, 'api': True
    },
    {
        'priority': 5, 'type': 'js', 'name': 'AdminLTE-3.0.0/plugins/slimScroll/jquery.slimscroll.min.js',
        'spa': True, 'api': True
    },
    {
        'priority': 101, 'type': 'css', 'name': 'AdminLTE-3.0.0/plugins/bootstrap/css/bootstrap.min.css',
        'spa': True, 'api': True
    },
    {
        'priority': 103, 'type': 'css', 'name': 'AdminLTE-3.0.0/plugins/font-awesome/css/font-awesome.min.css',
        'spa': True, 'api': True
    },
]

# Test settings for speedup tests
##############################################################
if TESTS_RUN:
    gc.disable()
    CELERY_TASK_ALWAYS_EAGER = True
    EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher',]
    CONTACT = dict(
        some_extra_url='https://pypi.org/project/vstutils/', **CONTACT
    )
    CELERY_RESULT_BACKEND = 'cache'
    CELERY_CACHE_BACKEND = 'memory'
    CACHES = {
        name: {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}
        for name in CACHES
    }

if not TESTSERVER_RUN and TESTS_RUN:
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'

# User settings
##############################################################
ENABLE_GRAVATAR = web["enable_gravatar"]
