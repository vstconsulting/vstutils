import os
import pwd
import sys
from warnings import warn

from configparser import ConfigParser
import pyximport
pyximport.install()
from .section import Section
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
                              os.path.join(BASE_DIR, os.getenv("VST_DEV_SETTINGS")))
CONFIG_FILE = os.getenv(
    "{}_SETTINGS_FILE".format(ENV_NAME),
    "/etc/{}/settings.ini".format(VST_PROJECT_LIB)
)
config = ConfigParser()
config.read([CONFIG_FILE, DEV_SETTINGS_FILE])


class SectionConfig(Section):
    config = config
    section = 'main'
    kwargs = KWARGS


class BackendsSectionConfig(SectionConfig):

    def key_handler(self, key):
        return super(BackendsSectionConfig, self).key_handler(key).upper()


main = SectionConfig('main')
web = SectionConfig('web')

# Secret file with key for hashing passwords
SECRET_FILE = os.getenv(
    "{}_SECRET_FILE".format(ENV_NAME), "/etc/{}/secret".format(VST_PROJECT_LIB)
)
SECRET_KEY = '*sg17)9wa_e+4$n%7n7r_(kqwlsc^^xdoc3&px$hs)sbz(-ml1'
try:
    with open(SECRET_FILE, "r") as secret_file:
        SECRET_KEY = secret_file.read().strip()  # nocv
except IOError:
    pass

# Main settings
##############################################################
# SECURITY WARNING: don't run with debug turned on in production!
TESTS_RUN = any([True for i in sys.argv if i in ['testserver', 'test']])
LOCALRUN = any([True for i in sys.argv if i not in ['collectstatic', 'runserver']]) or TESTS_RUN
TESTSERVER_RUN = 'testserver' in sys.argv
DEBUG = os.getenv('DJANGO_DEBUG', main.getboolean("debug", False))
ALLOWED_HOSTS = main.getlist("allowed_hosts", '*')
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
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'vstutils.middleware.TimezoneHeadersMiddleware',
]
# Fix for django 1.8-9
MIDDLEWARE_CLASSES = MIDDLEWARE

LDAP_SERVER = main.get("ldap-server", fallback=None)
LDAP_DOMAIN = main.get("ldap-default-domain", fallback='')
AUTHENTICATION_BACKENDS = [
    'vstutils.auth.LdapBackend',
    'django.contrib.auth.backends.ModelBackend'
]

# Sessions settings
# https://docs.djangoproject.com/en/1.11/ref/settings/#sessions
SESSION_COOKIE_AGE = web.getseconds("session_timeout", fallback='2w')
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

uwsgi_settings = SectionConfig('uwsgi')
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
                'vstutils.gui.context.headers_context',
            ],
        },
    },
]


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.10/howto/static-files/
##############################################################
STATIC_URL = web.get("static_files_url", fallback="/static/")
if LOCALRUN:
    STATICFILES_DIRS = [
        os.path.join(BASE_DIR, 'static'),
        os.path.join(VST_PROJECT_DIR, 'static'),
        os.path.join(VSTUTILS_DIR, 'static')
    ]

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
class DBSectionConfig(BackendsSectionConfig):
    section = 'database'
    subsections = ['options', 'test']
    section_defaults = {
        '.': {
            'engine': 'django.db.backends.sqlite3',
            'name': '{PROG}/db.{PROG_NAME}.sqlite3'
        },
        'test': {
            'serialize': 'false'
        }
    }
    types_map = {
        'conn_max_age': BackendsSectionConfig.int_seconds,
        'options.timeout': BackendsSectionConfig.int_seconds,
        'options.connect_timeout': BackendsSectionConfig.int_seconds,
        'options.read_timeout': BackendsSectionConfig.int_seconds,
        'options.write_timeout': BackendsSectionConfig.int_seconds,
        'test.serialize': BackendsSectionConfig.bool,
    }

    def key_handler(self, key):
        if not (self._current_section == self.section or key == self._current_section):
            return key  # nocv
        return super(DBSectionConfig, self).key_handler(key)


DATABASES = {
    'default': DBSectionConfig().all()
}
if DATABASES['default'].get('ENGINE', None) == 'django.db.backends.mysql':  # nocv
    import pymysql
    pymysql.install_as_MySQLdb()

if DATABASES['default'].get('ENGINE', None) == 'django.db.backends.sqlite3':
    try:
        timeout = DATABASES['default']['OPTIONS'].pop('timeout', 20)
        DATABASES['default']['OPTIONS']['timeout'] = timeout
    except:  # nocv
        pass


# Cache settings.
# Read more: https://docs.djangoproject.com/en/1.11/ref/settings/#caches
##############################################################
class CacheSectionConfig(BackendsSectionConfig):
    section = 'cache'
    subsections = ['options']
    section_defaults = {
        '.': {
            "backend": 'django.core.cache.backends.filebased.FileBasedCache',
            'location': '/tmp/{PROG_NAME}_django_cache_{__section}_{PY_VER}',
            'timeout': '10m'
        }
    }
    types_map = {
        'timeout': BackendsSectionConfig.int_seconds,
    }


default_cache = CacheSectionConfig('cache').all()
session_cache = CacheSectionConfig('session', default=default_cache).all()
session_cache['TIMEOUT'] = SESSION_COOKIE_AGE

CACHES = {
    'default': default_cache,
    "locks": CacheSectionConfig('locks').all(),
    "session": session_cache,
}


# E-Mail settings
# https://docs.djangoproject.com/en/1.10/ref/settings/#email-host
##############################################################
mail = SectionConfig('mail')
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_PORT = mail.getint("port", fallback=25)
EMAIL_HOST_USER = mail.get("user", fallback="")
EMAIL_HOST_PASSWORD = mail.get("password", fallback="")
EMAIL_USE_TLS = mail.getboolean("tls", fallback=False)
EMAIL_HOST = mail.get("host", None)
if EMAIL_HOST is None:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'


# Rest Api settings
# http://www.django-rest-framework.org/api-guide/settings/
##############################################################
PAGE_LIMIT = web.getint("page_limit", fallback=1000)
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
SWAGGER_API_DESCRIPTION = web.get('rest_swagger_description', fallback=vst_project_module.__doc__ or vst_lib_module.__doc__)
TERMS_URL = ''
CONTACT = SectionConfig('contact').all() or dict(name='System Administrator')
OPENAPI_PUBLIC = web.getboolean('public_openapi', fallback=False)

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
        r'settings': {
            'view': 'vstutils.api.views.SettingsViewSet', 'op_types': ['get', 'mod']
        },
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


# Internationalization
# https://docs.djangoproject.com/en/1.10/topics/i18n/
##############################################################
LANGUAGE_CODE = 'en'

LANGUAGES = (
  ('ru', 'Russian'),
  ('en', 'English'),
)

TIME_ZONE = main.get("timezone", fallback="UTC")
USE_I18N = True
USE_L10N = True
USE_TZ = True


# LOGGING settings
##############################################################
LOG_LEVEL = os.getenv('DJANGO_LOG_LEVEL', main.get("log_level", fallback="WARNING")).upper()
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
            'filename': SectionConfig("uwsgi").get("log_file", fallback='/dev/null')
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
rpc = SectionConfig('rpc')
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

CELERY_WORKER_CONCURRENCY = rpc.getint("concurrency", fallback=4)
CELERY_WORKER_HIJACK_ROOT_LOGGER = False
CELERY_TASK_IGNORE_RESULT = True
CELERYD_PREFETCH_MULTIPLIER = rpc.getint("prefetch_multiplier", fallback=1)
CELERYD_MAX_TASKS_PER_CHILD = rpc.getint("max_tasks_per_child", fallback=1)
CELERY_BROKER_HEARTBEAT = rpc.getint("heartbeat", fallback=10)
CELERY_ACCEPT_CONTENT = ['pickle', 'json']
CELERY_TASK_SERIALIZER = 'pickle'
CELERY_RESULT_EXPIRES = rpc.getint("results_expiry_days", fallback=1)
CELERY_BEAT_SCHEDULER = 'vstutils.celery_beat_scheduler:SingletonDatabaseScheduler'
CELERY_TASK_CREATE_MISSING_QUEUES = True

CREATE_INSTANCE_ATTEMPTS = rpc.getint("create_instance_attempts", fallback=10)
CONCURRENCY = rpc.getint("concurrency", fallback=4)
WORKER_QUEUES = ['celery']
RUN_WORKER = rpc.getboolean('enable_worker', fallback=has_django_celery_beat)


class WorkerSectionConfig(SectionConfig):
    section = 'worker'
    section_defaults = {
        '.': {
            'app': '{PROG_NAME}.wapp:app',
            'loglevel': LOG_LEVEL,
            'logfile': '/var/log/{PROG_NAME}/worker.log',
            'pidfile': '/run/{PROG_NAME}_worker.pid',
            'autoscale': '{},1'.format(CONCURRENCY),
            'hostname': '{}@%h'.format(pwd.getpwuid(os.getuid()).pw_name),
            'beat': True
        }
    }
    types_map = {
        'beat': SectionConfig.bool,
        'events': SectionConfig.bool,
        'task-events': SectionConfig.bool,
        'without-gossip': SectionConfig.bool,
        'without-mingle': SectionConfig.bool,
        'without-heartbeat': SectionConfig.bool,
        'purge': SectionConfig.bool,
        'discard': SectionConfig.bool,
    }

    def get_from_section(self, section, option=None):
        result = self.get_default_data_from_section(option)
        data = super(WorkerSectionConfig, self).get_from_section(section, option)
        result.update(data)
        return result

if RUN_WORKER:
    WORKER_OPTIONS = WorkerSectionConfig().all() if has_django_celery_beat else {}

# View settings
##############################################################
ENABLE_ADMIN_PANEL = main.getboolean('enable_admin_panel', False)

VIEWS = {
    "GUI": {
        "BACKEND": 'vstutils.gui.views.GUIView'
    },
    "LOGIN": {
        "BACKEND": 'vstutils.gui.views.Login'
    },
    "LOGOUT": {
        "BACKEND": 'vstutils.gui.views.Logout'
    },
}


# Test settings for speedup tests
##############################################################
if TESTS_RUN:
    CELERY_TASK_ALWAYS_EAGER = True
    EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher',]
    CONTACT = dict(
        some_extra_url='https://pypi.org/project/vstutils/', **CONTACT
    )
    CACHES = {
        name: {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}
        for name in CACHES
    }
    CELERY_RESULT_BACKEND = 'cache'
    CELERY_CACHE_BACKEND = 'memory'

if not TESTSERVER_RUN and TESTS_RUN:
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'

# User settings
##############################################################
ENABLE_GRAVATAR = web.get("enable_gravatar", fallback=True)