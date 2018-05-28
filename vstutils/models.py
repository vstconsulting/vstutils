from __future__ import unicode_literals

from django.db import models
from .utils import Paginator


class BQuerySet(models.QuerySet):  # nocv
    use_for_related_fields = True

    def paged(self, *args, **kwargs):
        return self.get_paginator(*args, **kwargs).items()

    def get_paginator(self, *args, **kwargs):
        return Paginator(self, *args, **kwargs)

    def _find(self, field_name, tp_name, *args, **kwargs):
        field = kwargs.get(field_name, None) or (list(args)[0:1]+[None])[0]
        if field is None:
            return self
        if isinstance(field, list):
            return getattr(self, tp_name)(**{field_name+"__in": field})
        return getattr(self, tp_name)(**{field_name: field})


class BaseModel(models.Model):
    # pylint: disable=no-member
    objects    = models.Manager.from_queryset(BQuerySet)

    def __init__(self, *args, **kwargs):  # nocv
        super(BaseModel, self).__init__(*args, **kwargs)
        self.no_signal = False

    class Meta:
        abstract = True

    def __str__(self):  # nocv
        return self.__unicode__()


class BModel(BaseModel):
    id         = models.AutoField(primary_key=True, max_length=20)
    hidden     = models.BooleanField(default=False)

    class Meta:
        abstract = True

    def __unicode__(self):  # nocv
        return "<{}>".format(self.id)
