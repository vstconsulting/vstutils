# pylint: disable=django-not-available,unused-import
import os

from setuptools import find_packages, setup
from setuptools.extension import Extension
from setuptools.command.sdist import sdist as _sdist
try:
    from Cython.Build import cythonize
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


def get_discription(file_path='README.rst'):
    with open(file_path) as readme:
        return readme.read()


def load_requirements(file_name, folder=os.path.dirname(os.path.dirname(__file__))):
    with open(os.path.join(folder, file_name)) as req_file:
        return req_file.read().strip().split('\n')


def make_extensions(extensions_list):
    if not isinstance(extensions_list, list):
        raise Exception("Extension list should be `list`.")

    file_types = [".py", ".pyx", ".c"] if has_cython else [".c", ".py"]

    ext_modules = []
    extensions_dict = {}
    for ext in extensions_list:
        for ftype in file_types:
            fname = ext.replace(".", "/") + ftype
            if os.path.exists(fname):
                extensions_dict[ext] = [fname, ]
                ext_modules.append(Extension(ext, [fname, ]))
                break

    ext_modules = list(Extension(m, f) for m, f in extensions_dict.items())
    ext_count = len(ext_modules)
    nthreads = ext_count if ext_count < 10 else 10

    if has_cython:
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
    ext_mod, ext_mod_dict = make_extensions(opts.pop('ext_modules_list', list()))
    opts['ext_modules'] = opts.get('ext_modules', list()) + ext_mod
    cmdclass = opts.get('cmdclass', dict())
    if 'compile' not in cmdclass:
        cmdclass.update({"compile": get_compile_command(ext_mod_dict)})
    if has_sphinx and 'build_sphinx' not in cmdclass:
        cmdclass['build_sphinx'] = BuildDoc
    opts['cmdclass'] = cmdclass
    setup(**opts)
