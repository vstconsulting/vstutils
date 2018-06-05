# pylint: disable=abstract-method,unused-import,undefined-variable
from __future__ import unicode_literals
import os
import sys
import logging
from collections import OrderedDict
from django.core.management.base import BaseCommand as _BaseCommand, CommandError
from django.conf import settings


logger = logging.getLogger(settings.VST_PROJECT)
logger_lib = logging.getLogger(settings.VST_PROJECT_LIB)


class BaseCommand(_BaseCommand):
    requires_system_checks = False
    keep_base_opts = False
    stdout, stderr = sys.stdout, sys.stderr
    help = "Service command for web-application"

    class CommandError(CommandError):
        pass

    def add_arguments(self, parser):
        super(BaseCommand, self).add_arguments(parser)
        parser.add_argument(
            '-l', '--log-level',
            action='store',
            dest='log-level',
            default=False,
            type=str,
            help='Set logs level [debug|warning|error|critical]')

    def _print(self, msg, style=None):
        style = style or 'HTTP_INFO'
        style = getattr(self.style, style, str)
        self.stdout.write(style(msg))

    def _settings(self, value, default=None):
        return getattr(settings, value, default)

    def _get_versions(self):
        versions = OrderedDict(django=super(BaseCommand, self).get_version())
        versions[self._settings('VST_PROJECT')] = self._settings('PROJECT_VERSION')
        if self._settings('VST_PROJECT') != self._settings('VST_PROJECT_LIB'):
            versions[self._settings('VST_PROJECT_LIB')] = self._settings(
                'PROJECT_LIB_VERSION'
            )
        if self._settings('VST_PROJECT') != "vstutils":
            versions['vstutils'] = self._settings('VSTUTILS_VERSION')
        return versions

    def get_version(self):
        return ' '.join([
            '{}={}'.format(k.title(), v) for k, v in self._get_versions().items()
        ])

    def handle(self, *args, **options):
        LOG_LEVEL = settings.LOG_LEVEL
        if options.get('log-level', False):
            LOG_LEVEL = options.get('log-level', LOG_LEVEL)
        logger.setLevel(LOG_LEVEL.upper())
        logger_lib.setLevel(LOG_LEVEL.upper())
        self.LOG_LEVEL = LOG_LEVEL.upper()
        os.environ.setdefault('DJANGO_LOG_LEVEL', self.LOG_LEVEL)
        return super(BaseCommand, self).handle(*args, **options)
