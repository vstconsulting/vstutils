import typing as _t
from django.db import models
from ..utils import Paginator


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
