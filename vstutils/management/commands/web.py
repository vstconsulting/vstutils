from functools import partial
import argparse
import asyncio
import os
import sys
import traceback

from django.conf import settings

from ._base import DockerCommand, run_process


class Command(DockerCommand):
    help = "Run All-in-One server."
    default_addrport = settings.WEB_ADDRPORT
    requires_system_checks = "__all__"
    interactive = False

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            '--addrport', '-p',
            default=self.default_addrport,
            dest='addrport', help='Specifies the web server address:port. Default: [:8080]',
        )
        if settings.RPC_ENABLED:
            parser.add_argument(
                '--rpc-worker',
                action=argparse.BooleanOptionalAction,
                default=getattr(settings, 'RUN_WORKER', False),
                help='Enable or disable celery worker.'
            )
        parser.add_argument(
            '--graceful-timeout',
            type=int,
            default=5,
            help='Timeout to wait for graceful shutdown.'
        )

    async def handle_processes(self, options):
        env = os.environ.copy()

        # Check if it is run under virtualenv
        if sys.prefix != '/usr':
            if sys.prefix not in env["PATH"]:
                env['PATH'] = f'{sys.prefix}/bin:{env["PATH"]}'

        addrport = options.get('addrport', self.default_addrport)

        # Collect additional arguments
        additional_args = ['--nomigrate']
        if options.get('no_color'):
            additional_args.append('--no-color')
        if options.get('force_color'):
            additional_args.append('--force-color')
        if options.get('pythonpath'):
            additional_args.extend(['--pythonpath', options['pythonpath']])
        if options.get('verbosity'):
            additional_args.extend(['--verbosity', options['verbosity']])
        if options.get('log-level'):
            additional_args.extend(['--log-level', options['log-level']])
        if options.get('traceback'):
            additional_args.append('--traceback')

        additional_args_str = ' '.join(map(str, additional_args))

        # Define commands for the two services
        web_worker_cmd = (
            f"{sys.executable} -m {settings.VST_PROJECT} "
            f"web_worker "
            f"--addrport {addrport} {additional_args_str}"
        )

        # Run the services
        tasks = []
        timeout = options.get('graceful_timeout', 5)
        print_func = self._print
        print_warning = partial(print_func, style='WARNING')
        print_error = partial(print_func, style='ERROR')
        kwargs = {
            'env': env,
            'timeout': timeout,
            'print_func': print_func,
            'print_warn': print_warning,
            'print_err': print_error,
        }

        try:
            tasks.append(asyncio.create_task(run_process(web_worker_cmd, **kwargs)))

            if settings.RPC_ENABLED and options.get('rpc_worker'):
                tasks.append(asyncio.create_task(
                    run_process(
                        f"{sys.executable} -m {settings.VST_PROJECT} rpc_worker {additional_args_str}",
                        **kwargs,
                    )
                ))

            done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)

            # Handle task completion
            for task in done:
                if task.exception() or task.result() != 0:
                    raise RuntimeError("One of the services exited with an error.")

        finally:
            # Cancel all remaining tasks
            for task in tasks:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

    def handle(self, *args, **options):
        super().handle(*args, **options)

        try:
            asyncio.run(self.handle_processes(options))
        except KeyboardInterrupt:
            self._print('Exit by user...', 'WARNING')
        except BaseException as err:  # noqa: B036
            if options['traceback']:
                self._print(traceback.format_exc())
            self._print(str(err), 'ERROR')
            sys.exit(1)
