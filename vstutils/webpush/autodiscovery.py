import importlib
from functools import lru_cache
from typing import Set

from django.apps import apps

from .base import BaseWebPush, BaseWebPushNotification

_base_classes = (BaseWebPush, BaseWebPushNotification)


def _is_custom_class(obj: type) -> bool:
    return isinstance(obj, type) and issubclass(obj, BaseWebPush) and obj not in _base_classes


@lru_cache(maxsize=None)
def get_web_pushes_classes() -> Set[BaseWebPush]:
    classes = set()
    for app_config in apps.get_app_configs():
        try:
            module = importlib.import_module(app_config.name + ".webpushes")
            for obj in module.__dict__.values():
                if _is_custom_class(obj):
                    classes.add(obj)
        except ImportError:
            pass
    return classes
