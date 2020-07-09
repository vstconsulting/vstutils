import typing as _t
from django.db import models
from .utils import Paginator
from .api import base as api_base


class register_view_decorator:
    method_type: _t.Text

    def __init__(self, method_type: _t.Text, *args, **kwargs):
        ...

    def __call__(self, func: _t.Callable) -> _t.Callable:
        ...


class register_view_action(register_view_decorator):
    def __init__(self, *args, **kwargs):
        super().__init__('action', *args, **kwargs)


class register_view_method(register_view_decorator):
    def __init__(self, *args, **kwargs):
        super().__init__('override_method', *args, **kwargs)


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
    generated_view: _t.Type[api_base.GenericViewSet]

    def __unicode__(self) -> _t.Text:
        ...


class BModel(BaseModel):
    id: _t.Union[_t.SupportsInt, models.AutoField]
    hidden: _t.Union[bool, models.BooleanField]
