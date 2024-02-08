from typing import TYPE_CHECKING, Type

from django.utils.module_loading import import_string
from vstutils.tasks import celery_app


if TYPE_CHECKING:  # nocv
    from .base import BaseWebPush


@celery_app.task(bind=True)
def send_webpushes(self, notification_class_path: str, args: tuple, kwargs: dict):
    notification_class: Type[BaseWebPush] = import_string(notification_class_path)
    notification_class(*args, **kwargs).send()
