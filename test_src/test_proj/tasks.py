from django.apps import apps
from vstutils.tasks import celery_app, TaskClass


class BaseCreateHostTask(TaskClass):
    def run(self, **kwargs) -> None:
        Host = apps.get_model('test_proj.Host')
        Host.objects.create(**kwargs)


class CreateHostTask(BaseCreateHostTask, uniq=True):
    pass


class InheritCreateHostTask(CreateHostTask):
    def run(self, **kwargs) -> None:
        return super(InheritCreateHostTask, self).run(**kwargs)


class Inherit2CreateHostTask(CreateHostTask, uniq=True):
    pass


class InheritNonUniqCreateHostTask(CreateHostTask, uniq=False):
    pass


celery_app.register_task(CreateHostTask())
celery_app.register_task(InheritCreateHostTask())
celery_app.register_task(Inherit2CreateHostTask())
celery_app.register_task(InheritNonUniqCreateHostTask())
