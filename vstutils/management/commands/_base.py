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
    interactive = False
    requires_system_checks = False
    keep_base_opts = False
    stdout, stderr = sys.stdout, sys.stderr
    help = "Service command for web-application"

    class CommandError(CommandError):
        pass

    def add_arguments(self, parser):
        super(BaseCommand, self).add_arguments(parser)
        parser.fromfile_prefix_chars = '@'
        parser.add_argument(
            '-l', '--log-level',
            action='store',
            dest='log-level',
            default=False,
            type=str,
            help='Set logs level [debug|warning|error|critical]')
        if self.interactive:
            parser.add_argument(
                '--noinput', '--no-input',
                action='store_false', dest='interactive', default=True,
                help="Do NOT prompt the user for input of any kind.",
            )


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

    def ask_user(self, message, default=None):
        # pylint: disable=import-error
        from django.utils.six.moves import input
        if getattr(self, 'interactive_mode', False):
            return input(message) or default
        return default

    def ask_user_bool(self, message, default=True):
        reply = self.ask_user(message, 'yes' if default else 'no').lower()
        if reply in ['y', 'yes']:
            return True
        elif reply in ['n', 'no']:
            return False

    def handle(self, *args, **options):
        # pylint: disable=invalid-name
        self.interactive_mode = options.pop('interactive', False)
        LOG_LEVEL = settings.LOG_LEVEL
        if options.get('log-level', False):
            LOG_LEVEL = options.pop('log-level', LOG_LEVEL)
        logger.setLevel(LOG_LEVEL.upper())
        logger_lib.setLevel(LOG_LEVEL.upper())
        self.LOG_LEVEL = LOG_LEVEL.upper()
        os.environ.setdefault('DJANGO_LOG_LEVEL', self.LOG_LEVEL)
