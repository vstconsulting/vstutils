from celery.app.task import BaseTask
from celery.result import AsyncResult


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
