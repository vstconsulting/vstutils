import os
import sys
from vstcompile import make_setup, load_requirements
try:
    from setuptools_rust import RustExtension, Binding
except ImportError:
    RustExtension = None


# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))
os.environ.setdefault('NOT_COMPRESS', 'True')
ext_list = []

if 'develop' in sys.argv:
    ext_list = []
elif os.environ.get('BUILD_OPTIMIZATION', 'false') == 'true':
    ext_list = [
        'vstutils.api.schema.inspectors',
        'vstutils.api.schema.schema',
        'vstutils.api.base',
        'vstutils.api.decorators',
        'vstutils.api.endpoint',
        'vstutils.api.validators',
        'vstutils.api.actions',
        'vstutils.oauth2.authentication',
        'vstutils.models.base',
        'vstutils.models.queryset',
        'vstutils.models.cent_notify',
        'vstutils.models.fields',
        'vstutils.models.custom_model',
        'vstutils.auth',
        'vstutils.celery_beat_scheduler',
        'vstutils.environment',
        'vstutils.middleware',
        'vstutils.utils',
        'vstutils.tools',
    ]

requirements = load_requirements('requirements.txt')
requirements_rpc = load_requirements('requirements-rpc.txt')

kwargs = dict(
    ext_modules_list=ext_list,
    static_exclude_min=[
        r'vstutils/templates/.*\.js$',
        r'vstutils/static/spa/.*\.js$'
        r'vstutils/static/spa/.*\.css$'
    ],
    install_requires=[
        "django~=" + (os.environ.get('DJANGO_DEP', "") or "5.1.5"),
    ]
    + requirements,
    extras_require={
        'test': load_requirements('requirements-test.txt'),
        'rpc': requirements_rpc,
        'ldap': load_requirements('requirements-ldap.txt'),
        'doc': load_requirements('requirements-doc.txt'),
        'prod': load_requirements('requirements-prod.txt'),
        'stubs': load_requirements('requirements-stubs.txt'),
        'pil': ['Pillow~=11.1.0'],
        'boto3': [
            i.replace('libcloud', 'libcloud,s3')
            for i in requirements
            if isinstance(i, str) and 'django-storages' in i
        ],
        'sqs': requirements_rpc + ['pycurl~=7.45.4'],
    },
    dependency_links=[
    ] + load_requirements('requirements-git.txt'),
    entry_points={
        'console_scripts': ['vstutilsctl=vstutils.__main__:cmd_execution']
    },
)

if RustExtension is not None and os.path.exists("vstutils_utils/Cargo.toml") and os.environ.get('BUILD_OPTIMIZATION', 'false') == 'true':
    kwargs['rust_extensions'] = [
        RustExtension("vstutils._utils", path="vstutils_utils/Cargo.toml", binding=Binding.PyO3),
        RustExtension("vstutils._tools", path="vstutils_tools/Cargo.toml", binding=Binding.PyO3),
    ]

all_deps = []
for key, deps in kwargs['extras_require'].items():
    if key not in ('stubs', 'sqs'):
        all_deps += deps

kwargs['extras_require']['all'] = all_deps

make_setup(**kwargs)
