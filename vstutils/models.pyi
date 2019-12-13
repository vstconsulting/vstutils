import typing as _t
from django.db import models
from .utils import Paginator


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


class Manager(BaseManager.from_queryset(BQuerySet)):
    ...


class BaseModel(models.Model):
    objects: Manager
    DoesNotExist: models.ObjectDoesNotExist

    def __unicode__(self) -> _t.Text:
        ...


class BModel(BaseModel):
    id: _t.Union[_t.SupportsInt, models.AutoField]
    hidden: _t.Union[bool, models.BooleanField]
