import os
from pathlib import Path

from ._base import BaseCommand
from ...utils import get_render
from ... import __version__


class Command(BaseCommand):
    interactive = True
    help = "Creates new project with all needed for build application."
    default_help = 'Specify the {} of project'

    _values_parser = {
        "name": {'required': True},
        "dir": {'help': 'Specify the directory where project will be.', 'default': './'},
        "guiname": {'default': ''}
    }

    files_to_create = {
        'frontend_src': {
            'app': {
                'index': Path('index.js')
            },
            '.editorconfig': Path('.editorconfig'),
            '.eslintrc.js': Path('.eslintrc.js'),
            '.prettierrc': Path('.prettierrc')
        },
        '{project_name}': {
            'models': {
                '__init__.py': Path('__init__.py')
            },
            '__init__.py': Path('__init__.py'),
            '__main__.py': Path('__main__.py'),
            'settings.ini': Path('settings.ini'),
            'settings.py': Path('settings.py'),
            'web.ini': Path('web.ini'),
            'wsgi.py': Path('wsgi.py'),
        },
        '.coveragerc': Path('.coveragerc'),
        '.gitignore': Path('.gitignore'),
        '.pep8': Path('.pep8'),
        'MANIFEST.in': Path('MANIFEST.in'),
        'package.json': Path('package.json'),
        'README.rst': Path('README.rst'),
        'requirements.txt': Path('requirements.txt'),
        'requirements-test.txt': Path('requirements-test.txt'),
        'setup.cfg': Path('setup.cfg'),
        'setup.py': Path('setup.py'),
        'test.py': Path('test.py'),
        'tox.ini': Path('tox.ini'),
        'tox_build.ini': Path('tox_build.ini'),
        'webpack.config.js.default': Path('webpack.config.js.default')
    }

    def add_arguments(self, parser):
        super().add_arguments(parser)
        for name, data in self._values_parser.items():
            kwargs = dict(**data)
            if not kwargs.get('help', None):
                kwargs['help'] = self.default_help.format(name)
            parser.add_argument(
                f'--{name}', dest=name, **data
            )

    def get_path(self, path, *paths) -> Path:
        return Path(os.path.expandvars(os.path.join(path, *paths))).expanduser()

    def create_file(self, render_path, path, **render_data):
        path.write_text(get_render(render_path + '.template', render_data))

    def _from_user(self, name, options, default=None):
        default = options.get(name, default)
        val_from_parser = self._values_parser.get(name, {})
        help_msg = val_from_parser.get('help', self.default_help.format(name))
        help_msg += f' Default: [{default}]'
        value = self.ask_user(help_msg, default)
        if value is None:
            raise self.CommandError(f'Value --{name} must be set.')
        return value

    def get_render_kwargs(self, options):
        project_name = self._from_user('name', options)
        project_gui_name = self._from_user('guiname', options) or project_name.upper()
        return {
            'project_name': project_name,
            'project_place': self._from_user('dir', options),
            'project_gui_name': project_gui_name,
            'vstutils_version': __version__,
            'project_gui_name_head_lines': '=' * len(project_gui_name)
        }

    def allow_create(self, path):
        root_dir_path = self.get_path(*path) if not isinstance(path, Path) else path
        if root_dir_path.exists() and len(list(root_dir_path.iterdir())) != 0:
            raise Exception(f'{root_dir_path} is not empty')

    def recursive_create(self, root, node, node_chain=None):
        if node_chain is None:
            node_chain = []

        for name, path_value in node.items():
            real_name = name.format(**self.render_vars)

            if not isinstance(path_value, Path):
                new_root = root/Path(real_name)
                new_root.mkdir()
                self.recursive_create(new_root, path_value, node_chain + [name.replace('{', '').replace('}', '')])
            else:
                template_path = str(Path('newproject', *node_chain) / path_value)
                self.create_file(template_path, root/real_name, **self.render_vars)

    def make_files(self, **render_vars):
        self.render_vars = render_vars
        self.path = self.get_path(*[render_vars['project_place'], render_vars['project_name']])
        self.allow_create(self.path)
        self.path.mkdir(exist_ok=True)
        self.recursive_create(self.path, self.files_to_create)

    def handle(self, *args, **options):
        super().handle(*args, **options)
        opts = self.get_render_kwargs(options)
        self.make_files(**opts)
        project_dir = os.path.join(opts['project_place'], opts['project_name'])
        self._print(
            f'Project successfully created at {project_dir}.', 'SUCCESS'
        )
