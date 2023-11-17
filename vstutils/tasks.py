from functools import wraps, WRAPPER_ASSIGNMENTS
from smtplib import SMTPException

from celery import Celery
from celery.signals import worker_process_init, worker_process_shutdown
from celery.exceptions import Reject
from celery.app.task import BaseTask
from celery.result import AsyncResult
from django.conf import settings
from django.apps import apps
from django.utils.module_loading import import_string

from .utils import send_template_email_handler, Lock, translate as _

celery_app: Celery = import_string(
    settings.WORKER_OPTIONS['app'].replace(':', '.')
)
notificator = None


def get_notificator():
    return apps.get_app_config('vstutils_api').module.notificator_class([])


@worker_process_init.connect
def init_notificator(*_, **__):
    # pylint: disable=global-statement
    global notificator
    notificator = get_notificator()  # nocv


@worker_process_shutdown.connect
def destruct_notificator(*_, **__):
    # pylint: disable=global-statement
    global notificator
    if notificator is not None:  # nocv
        del notificator


class TaskMeta(type):
    def __new__(mcs, name, bases, attrs, uniq=None):
        task_class = super(TaskMeta, mcs).__new__(mcs, name, bases, attrs)
        task_class.run = mcs.get_notificator_decorator(task_class.run)

        if uniq:
            task_class.run = mcs.get_unique_decorator(task_class.run)
            task_class.apply_async = mcs.get_unique_decorator(task_class.apply_async, is_apply=True)
        elif hasattr(task_class.run, '__uniq_wrapped__') and uniq is not None:
            task_class.run = task_class.run.__uniq_wrapped__
            task_class.apply_async = task_class.apply_async.__uniq_wrapped__

        return task_class

    @staticmethod
    def get_notificator_decorator(func):
        if getattr(func, '__notify_wrapped__', False):
            return func

        @wraps(func, assigned=WRAPPER_ASSIGNMENTS+('__notify_wrapped__',))
        def wrapper(self, *args, **kwargs):
            with notificator or get_notificator() as notifier:
                self.__notifier__ = notifier
                result = func(self, *args, **kwargs)
            self.__notifier__ = None
            return result

        wrapper.__notify_wrapped__ = True
        return wrapper

    @staticmethod
    def get_unique_decorator(func, is_apply=False):
        if getattr(func, '__uniq_wrapped__', False):
            return func

        @wraps(func, assigned=WRAPPER_ASSIGNMENTS+('__uniq_wrapped__',))
        def wrapper(self, *args, **kwargs):
            # pylint: disable=protected-access
            if not is_apply and self._get_app().conf.task_always_eager:
                return func(self, *args, **kwargs)
            try:
                with Lock(
                    f'uniq-celery-task-{self.name}',
                    err_msg=_("This task is currently performed by another worker.")
                ):
                    return func(self, *args, **kwargs)
            except Lock.AcquireLockException as err:
                raise Reject(str(err), requeue=False) from err

        wrapper.__uniq_wrapped__ = func
        return wrapper


class TaskClass(BaseTask, metaclass=TaskMeta):
    """
    Wrapper for Celery BaseTask class. Usage is same as Celery standard class, but you can execute task without
    creating instance with :meth:`TaskClass.do` method.

    Example:

        .. sourcecode:: python

            from vstutils.environment import get_celery_app
            from vstutils.tasks import TaskClass

            app = get_celery_app()

            class Foo(TaskClass):
                def run(*args, **kwargs):
                    return 'Foo task has been executed'

            app.register_task(Foo())

    Now you can call your task with various methods:
        - by executing ``Foo.do(*args, **kwargs)``
        - get registered task instance like that - app.tasks['full_path.to.task.class.Foo']

    Also you can make your registered task periodic, by adding it to CELERY_BEAT_SCHEDULE in settings.py:

        .. sourcecode:: python

            CELERY_BEAT_SCHEDULE = {
                'foo-execute-every-month': {
                    'task': 'full_path.to.task.class.Foo',
                    'schedule': crontab(day_of_month=1),
                },
            }

    """

    # pylint: disable=abstract-method

    @property
    def name(self):
        """
        property for proper Celery task execution, needed for :meth:`TaskClass.do` method to work
        """
        return self.__name__

    @property
    def __name__(self):
        return f'{self.__class__.__module__}.{self.__class__.__name__}'

    @classmethod
    def do(cls, *args, **kwargs) -> AsyncResult:
        """
        Method which send signal to celery for start remote task execution.
        All arguments will passed to the task :meth:`TaskClass.run` method.
        """
        return cls().delay(*args, **kwargs)


class SendEmailMessage(TaskClass):
    """
    Task for sending bulk emails, all args and kwargs are passed to :func:`vstutils.utils.send_template_email_handler`.
    Usually you don't need to call this manually, this is called by :func:`vstutils.utils.send_template_email`.
    """
    ignore_result = True

    def run(self, *args, **kwargs):
        try:
            send_template_email_handler(*args, **kwargs)
        except SMTPException as exc:
            raise self.retry(
                exc=exc,
                max_retries=settings.SEND_EMAIL_RETRIES,
                countdown=settings.SEND_MESSAGE_RETRY_DELAY
            )


celery_app.register_task(SendEmailMessage())
