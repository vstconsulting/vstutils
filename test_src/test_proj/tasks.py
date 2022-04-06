from django.apps import apps
from vstutils.tasks import celery_app, TaskClass


class CreateHostTask(TaskClass):
    def run(self, **kwargs) -> None:
        Host = apps.get_model('test_proj.Host')
        Host.objects.create(**kwargs)


celery_app.register_task(CreateHostTask())
