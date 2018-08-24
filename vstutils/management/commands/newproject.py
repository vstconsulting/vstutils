import os
from ._base import BaseCommand
from ...utils import get_render
from ... import __version__


class Command(BaseCommand):
    interactive = True
    help = "Creates new project with all needed for build application."
    default_help = 'Specify the {} of project'

    _values_parser = {
        "name": dict(required=True),
        "dir": dict(help='Specify the directory where project will be.', default='./'),
        "guiname": dict(default='')
    }

    files_to_create = {
        'project': [
            '__init__.py',
            '__main__.py',
            'settings.py'
        ],
        '': [
            'test.py',
            'setup.py',
            'setup.cfg',
            'MANIFEST.in',
            'requirements.txt',
            'README.rst',
        ]
    }

    def add_arguments(self, parser):
        super(Command, self).add_arguments(parser)
        for name, data in self._values_parser.items():
            kwargs = dict(**data)
            if not kwargs.get('help', None):
                kwargs['help'] = self.default_help.format(name)
            parser.add_argument(
                '--{}'.format(name), dest=name, **data
            )

    def get_path(self, *path):
        directory = os.path.expandvars('/'.join(path))
        directory = os.path.expanduser(directory)
        return directory

    def create_dir(self, *path):
        dir_path = self.get_path(*path)
        os.makedirs(dir_path)

    def create_file(self, render_path, *path, **render_data):
        with open('/'.join(path), 'w') as fd:
            fd.write(get_render(render_path + '.template', render_data))

    def _from_user(self, name, options, default=None):
        default = options.get(name, default)
        val_from_parser = self._values_parser.get(name, {})
        help_msg = val_from_parser.get('help', self.default_help.format(name))
        help_msg += ' Default: [{}]'.format(default)
        value = self.ask_user(help_msg, default)
        if value is None:
            raise self.CommandError('Value --{} must be set.'.format(name))
        return value

    def get_render_kwargs(self, options):
        project_name = self._from_user('name', options)
        project_gui_name = self._from_user('guiname', options) or project_name.upper()
        return dict(
            project_name=project_name,
            project_place=self._from_user('dir', options),
            project_gui_name=project_gui_name,
            vstutils_version=__version__,
            project_gui_name_head_lines='=' * len(project_gui_name)
        )

    def make_dirs(self, **render_vars):
        self.create_dir(
            render_vars['project_place'],
            render_vars['project_name']
        )
        self.create_dir(
            render_vars['project_place'],
            render_vars['project_name'],
            render_vars['project_name'],
        )

    def make_files(self, **render_vars):
        for place, file_names in self.files_to_create.items():
            path = [render_vars['project_place'], render_vars['project_name']]
            template_place = 'newproject/' + place
            if place == 'project':
                path.append(render_vars['project_name'])
                template_place += '/'
            for file_name in file_names:
                self.create_file(
                    template_place + file_name, *(path + [file_name]), **render_vars
                )

    def handle(self, *args, **options):
        super(Command, self).handle(*args, **options)
        opts = self.get_render_kwargs(options)
        self.make_dirs(**opts)
        self.make_files(**opts)
        project_dir = '/'.join([opts['project_place'], opts['project_name']])
        project_dir = project_dir.replace('//', '/')
        self._print(
            'Project successfully created at {}.'.format(project_dir), 'SUCCESS'
        )
