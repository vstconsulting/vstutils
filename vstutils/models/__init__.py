"""
Default Django model classes overrides in `vstutils.models` module.
"""

from django.db import models

from .base import ModelBaseClass
from .queryset import BQuerySet
from .model import BaseModel
from .decorators import register_view_action, register_view_method


class Manager(models.Manager.from_queryset(BQuerySet)):
    """
    Default VSTUtils manager. Used by `BaseModel` and `BModel`.
    Uses `BQuerySet` as base.
    """


class BModel(BaseModel):
    """
    Default model class with useful attributes.

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
        - ``POST``/``GET`` to ``/api/version/task/:id/stage/`` - creates new or get list of stages in task
        - ``PUT``/``PATCH``/``GET``/``DELETE`` to ``/api/version/task/:id/stage/:stage_id`` - updates, retrieves or
          removes instance of stage in task.

        For attach view to API just set in `settings.py` following code:

        .. sourcecode:: python

            API[VST_API_VERSION][r'task'] = {
                'model': 'your_application.models.Task'
            }

        For primary access to generated view, just inherit from `Task.generated_view` property.

        List of meta-attributes for generating a view:

        - ``_view_class`` - list of classes, class or string to import with base class ViewSet.
          Constants are also supported:

            - ``read_only`` - to create a view only for viewing;
            - ``history`` - to create a view only for viewing and deleting records.

          Default is simple CRUD-view.

        - ``_serializer_class`` - class of API serializer. Default is :class:`vstutils.api.serializers.VSTSerializer`.
          Can take a string to import.
        - ``_serializer_class_name`` - model name for OpenAPI definitions. Default is name of model class.
        - ``_list_fields`` or ``_detail_fields`` - list of fields which will show in entity view.
        - ``_override_list_fields`` or ``_override_detail_fields`` - mapping with names and field types
          that will declared in serializer attributes.
        - ``_extra_serializer_classes`` - mapping with additional serializers in viewset. Example, custom serializer,
          which will compute smthg in action (mapping name). Value can be string for import.
        - ``_filterset_fields`` - list of filterset names for API-filtering. Default is list of fields in list view.
          When processing a list of fields, it checks for the presence of special field names and inherit additional
          parent classes. If the list contains ``id``, class will inherit from
          :class:`vstutils.api.filters.DefaultIDFilter`. If the list contains ``name``, class will inherit from
          :class:`vstutils.api.filters.DefaultNameFilter`. If both conditions are present, inheritance will be from all
          of the above classes.
        - ``_filter_backends`` - list of `vstutils.api.filter_backends.VSTFilterBackend` classes.
          Values can be string for import.
        - ``_override_filter_backends`` - boolean flag indicates that ``_filter_backends`` override default viewset
          (otherwise appends). Default is ``False``.
        - ``_permission_classes`` - list of DRF permission classes. Values can be string for import.
        - ``_override_permission_classes`` - boolean flag indicates that ``_permission_classes`` override default
          viewset (otherwise appends). Default is ``False``.
        - ``_copy_attrs`` - list of model-instance attributes indicates that object is copiable with this attrs.
        - ``_nested`` - key-value mapping with nested views (key - nested name,
          kwargs for :class:`vstutils.api.decorators.nested_view` decorator but supports
          ``model`` attribute as nested). ``model`` can be string for import.

        .. note::
            Sometimes you may need to create an action on generated view. Use around the class method
            the :class:`vstutils.models.decorators.register_view_action` decorator with the ``detail`` argument
            to determine applicability to a list or detail entry.
            In this case, the decorated method will take an instance of the view object as ``self`` attribute.
    """

    #: Primary field for select and search in API.
    id = models.AutoField(primary_key=True, max_length=20)
    #: Useful field for hidden data.
    hidden = models.BooleanField(default=False)

    class Meta:
        abstract = True

    def __unicode__(self):
        return f"<{self.id}>"
