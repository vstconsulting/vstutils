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
            from rest_framework.fields import ChoiceField
            from vstutils.models import BModel

            class Stage(BModel):
                name = models.CharField(max_length=256)
                order = models.IntegerField(default=0)

                class Meta:
                    default_related_name = "stage"
                    ordering = ('order', 'id',)
                    # fields which would be showed on list.
                    _list_fields = [
                        'id',
                        'name',
                    ]
                    # fields which would be showed on detail view and creation.
                    _detail_fields = [
                        'id',
                        'name',
                        'order'
                    ]
                    # make order as choices from 0 to 9
                    _override_detail_fields = {
                        'order': ChoiceField((str(i) for i in range(10)))
                    }



            class Task(BModel):
                name = models.CharField(max_length=256)
                stages = models.ManyToManyField(Stage)

                class Meta:
                    # fields which would be showed.
                    _list_fields = [
                        'id',
                        'name',
                    ]
                    # create nested views from models
                    _nested = {
                        'stage': {
                            'allow_append': False,
                            'model': Stage
                        }
                    }


        In this case, you create models which could converted to simple view, where:

        - ``POST``/``GET`` to ``/api/version/task/`` - creates new or get list of tasks
        - ``PUT``/``PATCH``/``GET``/``DELETE`` to ``/api/version/task/:id/`` - updates, retrieves or removes instance of task
        - ``POST``/``GET` to ``/api/version/task/:id/stage/`` - creates new or get list of stages in task
        - ``PUT``/``PATCH``/``GET``/``DELETE`` to ``/api/version/task/:id/stage/:stage_id`` - updates, retrieves or removes instance of stage in task.
    """

    #: Primary field for select and search in API.
    id = models.AutoField(primary_key=True, max_length=20)
    #: Useful field for hidden data.
    hidden = models.BooleanField(default=False)

    class Meta:
        abstract = True

    def __unicode__(self):
        return f"<{self.id}>"
