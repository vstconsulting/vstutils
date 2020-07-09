"""
Default Django model classes overrides in `vstutils.models` module.
"""

from __future__ import unicode_literals
from django.db import models

from .base import ModelBaseClass
from .manager import BaseManager
from .queryset import BQuerySet
from .model import BaseModel
from .decorators import register_view_action, register_view_method


class Manager(BaseManager.from_queryset(BQuerySet)):  # type: ignore
    """
    Default VSTUtils manager. Used by `BaseModel` and `BModel`.
    Allows to use managers and querysets with cyfunctions-members.
    """


class BModel(BaseModel):
    """
    Default model class with usefull attributes.

    Examples:
        .. sourcecode:: python

            from django.db import models
            from vstutils.models import BModel


            class Stage(BModel):
                name = models.CharField(max_length=256)
                order = models.IntegerField(default=0)

                class Meta:
                    default_related_name = "stage"
                    ordering = ('order', 'id',)


            class Task(BModel):
                name = models.CharField(max_length=256)
                stages = models.ManyToManyField(Stage)
    """

    #: Primary field for select and search in API.
    id = models.AutoField(primary_key=True, max_length=20)
    #: Useful field for hidden data.
    hidden = models.BooleanField(default=False)

    class Meta:
        abstract = True

    def __unicode__(self):
        return f"<{self.id}>"
