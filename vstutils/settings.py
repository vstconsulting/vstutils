import os
import sys

from configparser import ConfigParser, NoSectionError, NoOptionError

from . import __version__ as VSTUTILS_VERSION, __file__ as vstutils_file

VSTUTILS_DIR = os.path.dirname(os.path.abspath(vstutils_file))
VST_PROJECT = os.getenv("VST_PROJECT", "vstutils")
VST_PROJECT_LIB = os.getenv("VST_PROJECT_LIB", VST_PROJECT)
ENV_NAME = os.getenv("VST_PROJECT_ENV", VST_PROJECT_LIB.upper())
vst_project_module = __import__(VST_PROJECT)
vst_lib_module = __import__(VST_PROJECT_LIB) if VST_PROJECT != VST_PROJECT_LIB else vst_project_module
PROJECT_LIB_VERSION = getattr(vst_lib_module, '__version__', VSTUTILS_VERSION)
PROJECT_VERSION = getattr(vst_project_module, '__version__', PROJECT_LIB_VERSION)
PROJECT_GUI_NAME = os.getenv("VST_PROJECT_GUI_NAME", ENV_NAME)

PY_VER = sys.version_info[0]
TMP_DIR = "/tmp"
BASE_DIR = os.path.dirname(os.path.abspath(vst_lib_module.__file__))
VST_PROJECT_DIR = os.path.dirname(os.path.abspath(vst_project_module.__file__))
__kwargs = dict(
    HOME=BASE_DIR, PY=PY_VER, TMP=TMP_DIR, PROG=VST_PROJECT_DIR, VST=VSTUTILS_DIR
)
KWARGS = __kwargs

DEV_SETTINGS_FILE = os.getenv("{}_DEV_SETTINGS_FILE".format(ENV_NAME),
                              os.path.join(BASE_DIR, os.getenv("VST_DEV_SETTINGS")))
CONFIG_FILE = os.getenv(
    "{}_SETTINGS_FILE".format(ENV_NAME),
    "/etc/{}/settings.ini".format(VST_PROJECT_LIB)
)
config = ConfigParser()
config.read([CONFIG_FILE, DEV_SETTINGS_FILE])

SECRET_FILE = os.getenv(
    "{}_SECRET_FILE".format(ENV_NAME), "/etc/{}/secret".format(VST_PROJECT_LIB)
)
SECRET_KEY = '*sg17)9wa_e+4$n%7n7r_(kqwlsc^^xdoc3&px$hs)sbz(-ml1'
try:
    with open(SECRET_FILE, "r") as secret_file:
        SECRET_KEY = secret_file.read().strip()  # nocv
except IOError:
    pass

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DJANGO_DEBUG', config.getboolean("main", "debug", fallback=False))

ALLOWED_HOSTS = [item for item in config.get("web",
                                             "allowed_hosts",
                                             fallback="*").split(",") if item != ""]
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTOCOL', 'https')

# Include some addons if packages exists in env
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

# Application definition
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
    # 'rest_framework_swagger',
    'django_filters',
]
INSTALLED_APPS += ['docs'] if HAS_DOCS else []

try:
    import mod_wsgi
except ImportError:  # pragma: no cover
    pass
else:
    INSTALLED_APPS += ['mod_wsgi.server',]  # pragma: no cover

ADDONS = ['vstutils', ]

INSTALLED_APPS += ADDONS

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

try:
    import ldap
    AUTHENTICATION_BACKENDS = [
        'vstutils.auth.LdapBackend',
        'django.contrib.auth.backends.ModelBackend',
    ]
    LDAP_SERVER = config.get("main", "ldap-server", fallback=None)
    LDAP_DOMAIN = config.get("main", "ldap-default-domain", fallback='')
except ImportError:  # nocv
    pass

ROOT_URLCONF = os.getenv('VST_ROOT_URLCONF', '{}.urls'.format(VST_PROJECT))

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

WSGI = os.getenv('VST_WSGI', '{}.wsgi'.format(VST_PROJECT))
WSGI_APPLICATION = "{}.application".format(WSGI)


try:
    __DB_SETTINGS = {k.upper():v.format(**KWARGS) for k,v in config.items('database')}
    if not __DB_SETTINGS: raise NoSectionError('database')
except NoSectionError:  # nocv
    __DB_SETTINGS = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(VST_PROJECT_DIR, 'db.{}.sqlite3'.format(VST_PROJECT_LIB)),
    }

__DB_OPTIONS = { }
try:
    int_values_types = ["timeout", "connect_timeout", "read_timeout", "write_timeout"]
    for k, v in config.items('database.options'):
        if k in int_values_types: #nocv
            __DB_OPTIONS[k] = int(float(v))
            continue
        __DB_OPTIONS[k] = v.format(**KWARGS)  # nocv
    if not __DB_OPTIONS: raise NoSectionError('database.options')
except NoSectionError:  # nocv
    __DB_OPTIONS = {}

if __DB_SETTINGS['ENGINE'] == 'django.db.backends.mysql':  # nocv
    import pymysql
    pymysql.install_as_MySQLdb()

if __DB_SETTINGS['ENGINE'] == 'django.db.{}.sqlite3'.format(VST_PROJECT):
    __DB_OPTIONS["timeout"] = __DB_OPTIONS.get("timeout", 20)  # nocv

__DB_SETTINGS["OPTIONS"] = __DB_OPTIONS

DATABASES = {
    'default': __DB_SETTINGS
}

# E-Mail settings
# https://docs.djangoproject.com/en/1.10/ref/settings/#email-host
try:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_PORT = config.getint("mail", "port", fallback=25)
    EMAIL_HOST_USER = config.get("mail", "user", fallback="")
    EMAIL_HOST_PASSWORD = config.get("mail", "password", fallback="")
    EMAIL_USE_TLS = config.getboolean("mail", "tls", fallback=False)
    EMAIL_HOST = config.get("mail", "host")
except (NoSectionError, NoOptionError):
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

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
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]
LOGIN_URL = '/login/'
LOGOUT_URL = '/logout/'
LOGIN_REDIRECT_URL = '/'


PAGE_LIMIT = config.getint("web", "page_limit", fallback=1000)

# Rest Api settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ),
    'EXCEPTION_HANDLER': 'vstutils.api.base.exception_handler',
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_SCHEMA_CLASS': 'vstutils.api.base.RestSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.LimitOffsetPagination',
    'PAGE_SIZE': config.getint("web", "rest_page_limit", fallback=PAGE_LIMIT),
}
# Internationalization
# https://docs.djangoproject.com/en/1.10/topics/i18n/

LANGUAGE_CODE = 'en'

LANGUAGES = (
  ('ru', 'Russian'),
  ('en', 'English'),
)

TIME_ZONE = config.get("main", "timezone", fallback="UTC")

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.10/howto/static-files/

STATIC_URL = config.get("web", "static_files_url", fallback="/static/")
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
    os.path.join(VST_PROJECT_DIR, 'static'),
    os.path.join(VSTUTILS_DIR, 'static')
]

STATICFILES_FINDERS = (
  'django.contrib.staticfiles.finders.FileSystemFinder',
  'django.contrib.staticfiles.finders.AppDirectoriesFinder',
)

if 'runserver' not in sys.argv:
    STATIC_ROOT = os.path.join(VST_PROJECT_DIR, 'static')

# Documentation files
# http://django-docs.readthedocs.io/en/latest/#docs-access-optional
DOCS_ROOT = os.path.join(BASE_DIR, 'doc/html')
DOCS_ACCESS = 'public'
DOC_URL = "/docs/"

# Celery settings
__broker_url = config.get("rpc", "connection", fallback="filesystem:///var/tmp").format(**KWARGS)
if __broker_url.startswith("filesystem://"):
    __broker_folder = __broker_url.split("://", 1)[1]
    CELERY_BROKER_URL = "filesystem://"
    CELERY_BROKER_TRANSPORT_OPTIONS = {
        "data_folder_in": __broker_folder,
        "data_folder_out": __broker_folder,
        "data_folder_processed": __broker_folder,
    }
else:
    CELERY_BROKER_URL = __broker_url  # nocv

CELERY_RESULT_BACKEND = config.get("rpc", "result_backend", fallback="file:///tmp").format(**KWARGS)
CELERY_WORKER_CONCURRENCY = config.getint("rpc", "concurrency", fallback=4)
CELERY_WORKER_HIJACK_ROOT_LOGGER = False
CELERY_BROKER_HEARTBEAT = config.getint("rpc", "heartbeat", fallback=10)
CELERY_ACCEPT_CONTENT = ['pickle', 'json']
CELERY_TASK_SERIALIZER = 'pickle'
CELERY_RESULT_EXPIRES = config.getint("rpc", "results_expiry_days", fallback=10)
CELERY_BEAT_SCHEDULER = 'vstutils.celery_beat_scheduler:SingletonDatabaseScheduler'

# Some hacks with logs

LOG_LEVEL = os.getenv('DJANGO_LOG_LEVEL',
                      config.get("main", "log_level",
                                 fallback="WARNING")).upper()
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
            'filename': config.get("uwsgi", "log_file", fallback='/dev/null')
        },
    },
    'loggers': {
        VST_PROJECT_LIB: {
            'handlers': ['console'],
            'level': LOG_LEVEL,
            'propagate': True,
        },
    }
}
SILENCED_SYSTEM_CHECKS = ['fields.W342', 'urls.W001', '1_10.W001',
                          "fields.W340", "urls.W005"]

try:
    __CACHE_DEFAULT_SETTINGS = {k.upper():v.format(**KWARGS) for k, v in config.items('cache')}
    if not __CACHE_DEFAULT_SETTINGS: raise NoSectionError('cache')
except NoSectionError:
    __CACHE_DEFAULT_SETTINGS = {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': '/tmp/{}_django_cache{}'.format(VST_PROJECT, sys.version_info[0]),
    }

try:
    __CACHE_LOCKS_SETTINGS = {k.upper():v.format(**KWARGS) for k, v in config.items('locks')}
    if not __CACHE_LOCKS_SETTINGS: raise NoSectionError('locks')
except NoSectionError:
    __CACHE_LOCKS_SETTINGS = {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': '/tmp/{}_django_locks{}'.format(VST_PROJECT, sys.version_info[0]),
    }


CACHES = {
    'default': __CACHE_DEFAULT_SETTINGS,
    "locks": __CACHE_LOCKS_SETTINGS
}

CREATE_INSTANCE_ATTEMPTS = config.getint("rpc", "create_instance_attempts", fallback=10)
CONCURRENCY = config.getint("rpc", "concurrency", fallback=4)

VST_API_URL = os.getenv("VST_API_URL", "api")
VST_API_VERSION = os.getenv("VST_API_VERSION", r'v1')
API_URL = VST_API_URL
API_CREATE_SCHEMA = config.getboolean('web', 'rest_schema', fallback=True)
API = {
    VST_API_VERSION: {
        r'settings': {
            'view': 'vstutils.api.views.SettingsViewSet', 'op_types': ['get', 'mod']
        },
        r'users': {
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


if "test" in sys.argv:
    CELERY_TASK_ALWAYS_EAGER = True
    EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
