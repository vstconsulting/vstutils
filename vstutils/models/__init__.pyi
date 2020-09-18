import typing as _t
from django.db import models
from ..api import base as api_base
from .queryset import BQuerySet as _BQuerySet
from .decorators import register_view_action as view_action, register_view_method as view_method
from .model import BaseModel as _BaseModel


class register_view_action(view_action):
    ...


class register_view_method(view_method):
    ...


class BQuerySet(_BQuerySet):
    ...


class Manager(models.Manager):
    ...


class BaseModel(_BaseModel):
    ...


class BModel(BaseModel):
    id: _t.Union[_t.SupportsInt, models.AutoField]
    hidden: _t.Union[bool, models.BooleanField]
