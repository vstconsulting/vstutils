# Compilation block
########################################################################################
import os
import sys

# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))

from setuptools import find_packages, setup
from setuptools.extension import Extension
from setuptools.command.sdist import sdist as _sdist
try:
    from Cython.Build import cythonize, build_ext as _build_ext
except ImportError:
    has_cython = False
else:
    has_cython = True

try:
    from sphinx.setup_command import BuildDoc
    import sphinx  # noqa: F401
    has_sphinx = True
except ImportError:
    has_sphinx = False


def get_discription(file_path='README.rst', folder=os.getcwd()):
    with open("{}/{}".format(folder, file_path)) as readme:
        return readme.read()


def load_requirements(file_name, folder=os.getcwd()):
    with open(os.path.join(folder, file_name)) as req_file:
        return req_file.read().strip().split('\n')


def get_file_ext(ext):
    file_types = [".py", ".pyx", ".c"] if has_cython else [".c", ".py"]
    for ftype in file_types:
        fname = ext.replace(".", "/") + ftype
        if os.path.exists(fname):
            return fname
    return None


def make_extensions(extensions_list):
    if not isinstance(extensions_list, list):
        raise Exception("Extension list should be `list`.")

    extensions_dict = {}
    for ext in extensions_list:
        files = []
        module_name = ext
        if isinstance(ext, (list, tuple)):
            module_name = ext[0]
            for file_module in ext[1]:
                file_name = get_file_ext(file_module)
                files += [file_name] if file_name else []
        else:
            file_name = get_file_ext(ext)
            files += [file_name] if file_name else []
        if files:
            extensions_dict[module_name] = files

    ext_modules = list(Extension(m, f) for m, f in extensions_dict.items())
    ext_count = len(ext_modules)
    nthreads = ext_count if ext_count < 10 else 10

    if has_cython and 'compile' in sys.argv:
        return cythonize(ext_modules, nthreads=nthreads, force=True), extensions_dict
    return ext_modules, extensions_dict


class _Compile(_sdist):
    extensions_dict = dict()

    def __filter_files(self, files):
        for _files in self.extensions_dict.values():
            for file in _files:
                if file in files:
                    files.remove(file)
        return files

    def make_release_tree(self, base_dir, files):
        if has_cython:
            files = self.__filter_files(files)
        _sdist.make_release_tree(self, base_dir, files)

    def run(self):
        return _sdist.run(self)


def get_compile_command(extensions_dict=None):
    extensions_dict = extensions_dict or dict()
    compile_class = _Compile
    compile_class.extensions_dict = extensions_dict
    return compile_class


def make_setup(**opts):
    if 'packages' not in opts:
        opts['packages'] = find_packages()
    ext_list = opts.pop('ext_modules_list', list())
    if 'develop' not in sys.argv:
        ext_mod, ext_mod_dict = make_extensions(ext_list)
        opts['ext_modules'] = opts.get('ext_modules', list()) + ext_mod
    cmdclass = opts.get('cmdclass', dict())
    if 'compile' not in cmdclass and 'develop' not in sys.argv:
        cmdclass.update({"compile": get_compile_command(ext_mod_dict)})
    if has_cython and 'develop' not in sys.argv:
        cmdclass.update({'build_ext': _build_ext})
    if has_sphinx and 'build_sphinx' not in cmdclass:
        cmdclass['build_sphinx'] = BuildDoc
    opts['cmdclass'] = cmdclass
    setup(**opts)

########################################################################################
# end block

ext_list = [
    'vstutils.exceptions',
    'vstutils.environment',
    'vstutils.middleware',
    'vstutils.tests',
    'vstutils.auth',
    'vstutils.urls',
    'vstutils.utils',
    'vstutils.models',
    'vstutils.ldap_utils',
    'vstutils.templatetags.vstconfigs',
    'vstutils.templatetags.request_static',
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
    packages=find_packages(exclude=['tests', 'test_proj']),
    ext_modules_list=ext_list,
    include_package_data=True,
    install_requires=[
        "django>=1.11,<2.0",
        'cython>0.28,<1.0',
    ] +
    load_requirements('requirements.txt') + load_requirements('requirements-doc.txt'),
    extras_require={
        'test': load_requirements('requirements-test.txt'),
        'rpc': load_requirements('requirements-rpc.txt'),
        'ldap': load_requirements('requirements-ldap.txt'),
        'doc': ['django-docs==0.2.1'] + load_requirements('requirements-doc.txt'),
        'prod': load_requirements('requirements-prod.txt'),
        'coreapi': load_requirements('requirements-coreapi.txt'),
    },
    dependency_links=[
    ] + load_requirements('requirements-git.txt'),
    project_urls={
        "Issue Tracker": "https://github.com/vstconsulting/vstutils/issues",
        "Source Code": "https://github.com/vstconsulting/vstutils",
        "Releases": "https://pypi.org/project/vstutils/#history",
    },
)

make_setup(**kwargs)
