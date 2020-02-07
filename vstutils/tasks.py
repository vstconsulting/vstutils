from celery.app.task import BaseTask


class TaskClass(BaseTask):

    @property
    def name(self):
        return self.__name__

    @property
    def __name__(self):
        return f'{self.__class__.__module__}.{self.__class__.__name__}'

    @classmethod
    def do(cls, *args, **kwargs):
        return cls().delay(*args, **kwargs)
