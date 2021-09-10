import sys

from ._base import DockerCommand


class Command(DockerCommand):
    interactive = True
    help = "Run migration in docker container."

    def handle(self, *args, **options):
        super().handle(*args, **options)

        success, error = self.migrate(options)
        if not success:
            self._print(error, 'ERROR')
            sys.exit(10)
