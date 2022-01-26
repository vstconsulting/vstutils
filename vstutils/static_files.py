import traceback
from pathlib import Path
from logging import getLogger

from orjson import loads
from configparserc.tools import File
from django.conf import settings
from django.utils.functional import cached_property
from vstutils.utils import StaticFilesHandlers


logger = getLogger('vstutils')


class BaseStaticObjectHandler:
    def __init__(self, name, priority=254):
        self.name = name
        self.priority = priority

    def get_spa_static_list(self):
        return ()  # nocv

    @cached_property
    def spa_static_list(self):
        return self.get_spa_static_list()


class SPAStaticObjectHandler(BaseStaticObjectHandler):
    def get_spa_static_list(self):
        return tuple(settings.SPA_STATIC)


class WebpackJsonStaticObjectHandler(BaseStaticObjectHandler):
    def __init__(self, *args, **kwargs):
        self.json_file = kwargs.pop('json_file', str(Path(settings.VSTUTILS_DIR)/'static/bundle/output.json'))
        self.prefix = kwargs.pop('prefix', str(Path(self.json_file.split('/static/')[-1]).parent))
        self.entrypoint_name = kwargs.pop('entrypoint_name', kwargs.get('name'))
        super().__init__(*args, **kwargs)

    @cached_property
    def spa_static_list(self):
        return tuple(self.get_static_files_paths(self.get_static_files()))

    def get_static_files_paths(self, files_list):
        for obj in files_list:
            path = Path(obj['name'])
            priority = self.priority
            if path.stem != self.entrypoint_name:
                priority -= 1
            yield {
                'priority': priority,
                'type': path.suffix.replace('.', '') or 'js',
                'name': str(self.prefix / path),
                'source': self.name,
            }

    def get_static_files(self):
        with File(self.json_file) as fd:
            try:
                return loads(fd.read())['entrypoints'][self.entrypoint_name]['assets']
            except:  # nocv
                logger.exception(traceback.format_exc())


SPA_STATIC_FILES_PROVIDERS = StaticFilesHandlers('SPA_STATIC_FILES_PROVIDERS')
