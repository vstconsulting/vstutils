import os

# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))

from vstutils.compile import load_requirements, make_setup, find_packages

ext_list = [
    'vstutils.environment',
    'vstutils.exceptions',
    'vstutils.middleware',
    'vstutils.tests',
    'vstutils.auth',
    'vstutils.urls',
    'vstutils.utils',
    'vstutils.models',
    'vstutils.ldap_utils',
    'vstutils.gui.views',
    'vstutils.gui.context',
    'vstutils.api.base',
    'vstutils.api.filters',
    'vstutils.api.permissions',
    'vstutils.api.routers',
    'vstutils.api.serializers',
    'vstutils.api.views',
]

make_setup(
    packages=find_packages(exclude='tests'),
    ext_modules_list=ext_list,
    include_package_data=True,
    install_requires=[
        "django>=1.11,<2.0",
    ] +
    load_requirements('requirements.txt') + load_requirements('requirements-doc.txt'),
    extras_require={
        'test': load_requirements('requirements-test.txt'),
        'rpc': load_requirements('requirements-rpc.txt'),
        'ldap': load_requirements('requirements-ldap.txt'),
        'doc': ['django-docs==0.2.1'] + load_requirements('requirements-doc.txt'),
    },
    dependency_links=[
    ] + load_requirements('requirements-git.txt'),
    project_urls={
        "Issue Tracker": "https://github.com/vstconsulting/vstutils/issues",
        "Source Code": "https://github.com/vstconsulting/vstutils",
        "Releases": "https://pypi.org/project/vstutils/#history",
    },
)
