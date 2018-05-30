# pylint: disable=abstract-method,unused-import,undefined-variable
from __future__ import unicode_literals
from collections import OrderedDict
from django.core.management.base import BaseCommand as _BaseCommand, CommandError
from django.conf import settings


class BaseCommand(_BaseCommand):
    help = "Service command for web-application"

    class CommandError(CommandError):
        pass

    def _print(self, msg, style=None):
        style = style or 'HTTP_INFO'
        style = getattr(self.style, style, str)
        self.stdout.write(style(msg))

    def _settings(self, value, default=None):
        return getattr(settings, value, default)

    def get_version(self):
        versions = OrderedDict(django=super(BaseCommand, self).get_version())
        versions[self._settings('VST_PROJECT')] = self._settings('PROJECT_VERSION')
        if self._settings('VST_PROJECT') != self._settings('VST_PROJECT_LIB'):
            versions[self._settings('VST_PROJECT_LIB')] = self._settings(
                'PROJECT_LIB_VERSION'
            )
        if self._settings('VST_PROJECT') != "vstutils":
            versions['vstutils'] = self._settings('VSTUTILS_VERSION')
        return ' '.join(['{}={}'.format(k.title(), v) for k, v in versions.items()])
