# pylint: disable=abstract-method,unused-import,undefined-variable
from django.core.management.base import BaseCommand as _BaseCommand, CommandError


class BaseCommand(_BaseCommand):
    help = "Service command for web-application"

    class CommandError(CommandError):
        pass
