from vstutils.compile import load_requirements, make_setup, os, find_packages


# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))

RMF = os.path.join(os.path.dirname(__file__), 'README.rst')

REQUIRES = load_requirements('requirements.txt')
REQUIRES += load_requirements('requirements-doc.txt')
REQUIRES_git = load_requirements('requirements-git.txt')

ext_list = [
    'vstutils.environment',
    'vstutils.exceptions',
    'vstutils.middleware',
    'vstutils.tests',
    'vstutils.urls',
    'vstutils.utils',
    'vstutils.gui.views',
    'vstutils.api.base',
    'vstutils.api.context',
    'vstutils.api.filters',
    'vstutils.api.permissions',
    'vstutils.api.routers',
    'vstutils.api.serializers',
    'vstutils.api.views',
]

make_setup(
    name='vstutils',
    packages=find_packages(exclude='tests'),
    ext_modules_list=ext_list,
    include_package_data=True,
    install_requires=[
        "django>=1.11,<2.0",
    ] + REQUIRES,
    dependency_links=[
    ] + REQUIRES_git,
)
