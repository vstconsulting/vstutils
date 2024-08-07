import pathlib
import json
import sys

from celery.result import AsyncResult
from django.utils.module_loading import import_string

from ._base import DockerCommand


class Command(DockerCommand):
    interactive = True
    help = "Run tasks in container environment, like a CronJob."

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            '--sync',
            action='store_true',
            dest='sync',
            default=False,
            help="Run task in sync mode.",
        )
        parser.add_argument(
            '-k', '--kwargs',
            action='store',
            dest='kwargs',
            default='{}',
            type=str,
            help='Setup named arguments as json.'
        )
        parser.add_argument(
            '--task',
            action='store',
            dest='task',
            default='',
            type=str,
            help='Setup named arguments as json.'
        )

    def _parse_arg(self, func, *args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as err:
            self._print(str(err), "ERROR")
            sys.exit(-1)

    def handle(self, *args, **options):
        super().handle(*args, **options)

        task = options['task']
        self._print(f'Run "{task}"', 'WARNING')

        opt_kwargs = options['kwargs'].strip()
        if not (opt_kwargs.startswith('{') and opt_kwargs.endswith('}')):
            opt_kwargs = pathlib.Path(opt_kwargs).read_text('utf-8').strip()
        kwargs, task = self._parse_arg(json.loads, opt_kwargs), self._parse_arg(import_string, options['task'])()
        task_result: AsyncResult = self._parse_arg(task.apply if options['sync'] else task.apply_async, kwargs=kwargs)

        self._print(f'Task "{task}" is executed with id "{task_result.task_id}".', 'SUCCESS')
