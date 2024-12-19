import sys
import os
import traceback
import contextlib
import subprocess

from django.conf import settings
try:
    from celery.bin import worker as worker_command
except ImportError:  # nocv
    worker_command = None

from ._base import DockerCommand, get_celery_command


class Command(DockerCommand):
    interactive = False
    help = "Run celery worker with arguments from config."

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            '--graceful-shutdown-timeout',
            default=10,
            dest='graceful_timeout', help='Seconds before call SIGKILL.',
            type=int,
        )
        if worker_command is None:
            return  # nocv
        worker_options = parser.add_argument_group('worker options', 'Override worker arguments.')
        options = set()
        for opt in worker_command.worker.params:
            if opt.name not in {'loglevel'}:
                extra = {}
                if opt.name in settings.WORKER_OPTIONS:
                    extra['default'] = settings.WORKER_OPTIONS[opt.name]
                if choices := getattr(opt.type, 'choices', None):
                    extra['choices'] = choices
                elif not opt.is_flag:
                    extra['metavar'] = opt.type.name.upper()

                worker_options.add_argument(
                    action='store_true' if opt.is_flag else 'store',
                    dest=opt.name,
                    required=False,
                    help=opt.help,
                    *opt.opts,
                    **extra,
                )
                options.add(opt.name)

        self.worker_options = options

    def handle(self, *args, **options):  # nocv
        super().handle(*args, **options)

        # Environment
        env = os.environ.copy()
        if sys.prefix not in env["PATH"]:
            env['PATH'] = f'{sys.prefix}/bin:{env["PATH"]}'
        command_kwargs = {}
        if 'log-level' in options:
            command_kwargs['loglevel'] = self.LOG_LEVEL
        for opt in filter(self.worker_options.__contains__, options):
            if (opt_value := options[opt]) is not None:
                command_kwargs[opt.replace('_', '-')] = opt_value
        try:
            cmd = get_celery_command(**command_kwargs)
            self._print(f'Execute: {cmd}')
            with subprocess.Popen(
                    cmd,
                    env=env,
                    shell=True,  # nosec
                    stdout=None,
                    stderr=None,
                    stdin=sys.stdin,
            ) as proc:
                try:
                    proc.wait()
                except BaseException as exc:
                    proc.terminate()
                    try:
                        proc.wait(options['graceful_timeout'])
                    except subprocess.TimeoutExpired:
                        with contextlib.suppress(Exception):
                            self._print('Killing process', 'CRITICAL')
                            proc.kill()
                    proc.wait()
                    raise exc
        except KeyboardInterrupt:  # nocv
            self._print('Exit by user...', 'WARNING')
        except BaseException as err:  # noqa: B036
            if options['traceback']:  # nocv
                self._print(traceback.format_exc())  # nocv
            self._print(str(err), 'ERROR')  # nocv
            sys.exit(1)  # nocv
