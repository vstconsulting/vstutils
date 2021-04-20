from smtplib import SMTPException

from celery import Celery
from celery.app.task import BaseTask
from celery.result import AsyncResult
from django.conf import settings

from .utils import import_class, send_template_email_handler

celery_app: Celery = import_class(
    settings.WORKER_OPTIONS['app'].replace(':', '.')  # type: ignore
)


class TaskClass(BaseTask):
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

            app.tasks.register(Foo())

        Now you can call your task with various methods:
            - by executing Foo.do(*args, **kwargs)
            - get registered task instance like that - app.tasks['full_path.to.task.class.Foo']

        Also you can make you registered task periodic, by adding it to CELERY_BEAT_SCHEDULE in settings.py:

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

    def run(self, *args, **kwargs):
        try:
            send_template_email_handler(*args, **kwargs)
        except SMTPException as exc:
            raise self.retry(
                exc=exc,
                max_retries=settings.SEND_EMAIL_RETRIES,
                countdown=settings.SEND_MESSAGE_RETRY_DELAY
            )


celery_app.tasks.register(SendEmailMessage())  # type: ignore
