from smtplib import SMTPException

from celery.app.task import BaseTask
from celery.result import AsyncResult
from django.conf import settings

from .utils import import_class, send_template_email_handler


celery_app = import_class(
    settings.WORKER_OPTIONS['app'].replace(':', '.')  # type: ignore
)


class TaskClass(BaseTask):
    # pylint: disable=abstract-method

    @property
    def name(self):
        return self.__name__

    @property
    def __name__(self):
        return f'{self.__class__.__module__}.{self.__class__.__name__}'

    @classmethod
    def do(cls, *args, **kwargs) -> AsyncResult:
        return cls().delay(*args, **kwargs)


class SendEmailMessage(TaskClass):

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
