import typing as _t
from django.db import models
from .utils import Paginator
from .api import base as api_base


class ObjectDoesNotExist(Exception):
    """The requested object does not exist"""
    silent_variable_failure = True


class BQuerySet(models.QuerySet):
    use_for_related_fields: _t.ClassVar[bool] = True
    custom_iterable_class: _t.ClassVar[_t.Any]

    def paged(self, *args, **kwargs) -> _t.Iterable:
        ...

    def get_paginator(self, *args, **kwargs) -> Paginator:
        ...

    def cleared(self) -> BQuerySet:
        ...

    def _find(self, field_name, tp_name, *args, **kwargs) -> BQuerySet:
        ...

    @classmethod
    def as_manager(cls) -> models.Manager:
        ...


class BaseManager(models.Manager):
    ...


class Manager(BaseManager):
    ...


class BaseModel(models.Model):
    objects: Manager
    DoesNotExist: ObjectDoesNotExist
    generated_view: api_base.GenericViewSet

    def __unicode__(self) -> _t.Text:
        ...


class BModel(BaseModel):
    id: _t.Union[_t.SupportsInt, models.AutoField]
    hidden: _t.Union[bool, models.BooleanField]
