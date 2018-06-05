import os

# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))

try:
    from vstcompile import load_requirements, make_setup, find_packages
    has_vstcompile = True
except ImportError:
    has_vstcompile = False
    from setuptools import setup as make_setup, find_packages

    def load_requirements(file_name, folder=os.getcwd()):
        with open(os.path.join(folder, file_name)) as req_file:
            return req_file.read().strip().split('\n')


ext_list = [
    'vstutils.exceptions',
    'vstutils.middleware',
    'vstutils.tests',
    'vstutils.auth',
    'vstutils.urls',
    'vstutils.utils',
    'vstutils.models',
    'vstutils.ldap_utils',
    'vstutils.templatetags.vstconfigs',
    'vstutils.gui.views',
    'vstutils.gui.context',
    'vstutils.api.base',
    'vstutils.api.filters',
    'vstutils.api.permissions',
    'vstutils.api.routers',
    'vstutils.api.serializers',
    'vstutils.api.views',
]

kwargs = dict(
    packages=find_packages(exclude=['tests']+ext_list),
    include_package_data=True,
    install_requires=[
        "django>=1.11,<2.0",
        'vstcompile',
    ] +
    load_requirements('requirements.txt') + load_requirements('requirements-doc.txt'),
    extras_require={
        'test': load_requirements('requirements-test.txt'),
        'rpc': load_requirements('requirements-rpc.txt'),
        'ldap': load_requirements('requirements-ldap.txt'),
        'doc': ['django-docs==0.2.1'] + load_requirements('requirements-doc.txt'),
        'prod': load_requirements('requirements-prod.txt'),
        'coreapi': ['coreapi==2.3.3', 'drf-yasg==1.8.0'],
    },
    dependency_links=[
    ] + load_requirements('requirements-git.txt'),
    project_urls={
        "Issue Tracker": "https://github.com/vstconsulting/vstutils/issues",
        "Source Code": "https://github.com/vstconsulting/vstutils",
        "Releases": "https://pypi.org/project/vstutils/#history",
    },
)
if has_vstcompile:
    kwargs['ext_modules_list'] = ext_list

make_setup(**kwargs)
