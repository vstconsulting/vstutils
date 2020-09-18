import typing as _t
from django.db import models
from ..api import base as api_base
from .queryset import BQuerySet
from .base import ModelBaseClass


class ObjectDoesNotExist(Exception):
    """The requested object does not exist"""
    silent_variable_failure = True


class BaseModel(models.Model, metaclass=ModelBaseClass):
    objects: _t.Union[models.Manager, BQuerySet]  # type: ignore
    DoesNotExist: ObjectDoesNotExist
    generated_view: _t.Type[api_base.GenericViewSet]

    def __unicode__(self) -> _t.Text:
        ...
