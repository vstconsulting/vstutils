from typing import Optional, Text
from .utils import Lock as Lock, import_class as import_class, send_template_email_handler as send_template_email_handler
from celery import Celery
from celery.app.task import BaseTask
from celery.result import AsyncResult
from .models.cent_notify import Notificator

celery_app: Celery
notificator: Optional[Notificator]

def get_notificator() -> Notificator: ...

class TaskMeta(type):
    def __new__(mcs, name, bases, attrs, uniq: Optional[bool] = ...): ...
    __notifier__: Notificator
    @staticmethod
    def get_notificator_decorator(func): ...
    @staticmethod
    def get_unique_decorator(func, is_apply: bool = ...): ...

class TaskClass(BaseTask, metaclass=TaskMeta):
    @property
    def name(self) -> Text: ...
    @property
    def __name__(self) -> Text: ...
    @classmethod
    def do(cls, *args, **kwargs) -> AsyncResult: ...

class SendEmailMessage(TaskClass):
    ignore_result: bool
    def run(self, *args, **kwargs) -> None: ...
