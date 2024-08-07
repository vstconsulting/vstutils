import importlib
from functools import lru_cache
from typing import Set

from django.apps import apps
from django.conf import settings

if settings.WEBPUSH_ENABLED:
    from .base import BaseWebPush, BaseWebPushNotification


@lru_cache(maxsize=None)
def get_web_pushes_classes() -> Set['BaseWebPush']:
    base_classes = (BaseWebPush, BaseWebPushNotification)

    def _is_custom_class(obj: type) -> bool:
        return isinstance(obj, type) and issubclass(obj, BaseWebPush) and obj not in base_classes

    classes = set()
    for app_config in apps.get_app_configs():
        try:
            module = importlib.import_module(app_config.name + ".webpushes")
            for obj in module.__dict__.values():
                if _is_custom_class(obj) and (
                    obj.project is None or
                    obj.project == settings.VST_PROJECT
                ):
                    classes.add(obj)
        except ImportError:
            pass
    return classes
