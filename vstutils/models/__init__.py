"""
Default Django model classes overrides in `vstutils.models` module.
"""

import logging

from django.db import models
from django.db.models import signals
from django.dispatch import receiver
from django.conf import settings
from django.contrib.auth import get_user_model

from cent import Client as CentrifugoClient

from .base import ModelBaseClass
from .queryset import BQuerySet
from .model import BaseModel
from .decorators import register_view_action, register_view_method
from ..utils import raise_context
from .fields import (
    NamedBinaryFileInJSONField,
    NamedBinaryImageInJSONField,
    MultipleNamedBinaryFileInJSONField,
    MultipleNamedBinaryImageInJSONField,
    FkModelField
)

logger = logging.getLogger('vstutils')


class Manager(models.Manager.from_queryset(BQuerySet)):
    """
    Default VSTUtils manager. Used by `BaseModel` and `BModel`.
    Uses `BQuerySet` as base.
    """


class BModel(BaseModel):
    """
    Default model class that generates model viewset, separate serializers for list() and retrieve(), filters,
    api endpoints and nested views.

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
                _translate_model = 'Task'

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

        To attach a view to an API insert the following code in `settings.py`:

        .. sourcecode:: python

            API[VST_API_VERSION][r'task'] = {
                'model': 'your_application.models.Task'
            }

        For primary access to generated view inherit from `Task.generated_view` property.

        To make translation on frontend easier use ``_translate_model`` attribute with model_name

        List of meta-attributes for generating a view:

        - ``_view_class`` - list of additional view classes to inherit from,
          class or string to import with base class ViewSet.
          Constants are also supported:

            - ``read_only`` - to create a view only for viewing;
            - ``list_only`` - to create a view with list only;
            - ``history`` - to create a view only for viewing and deleting records.

          CRUD-view is applied by default.

        - ``_serializer_class`` - class of API serializer; use this attribute to specify parent class for autogenerated serializers.
          Default is :class:`vstutils.api.serializers.VSTSerializer`.
          Can take a string to import, serializer class or :class:`django.utils.functional.SimpleLazyObject`.
        - ``_serializer_class_name`` - model name for OpenAPI definitions.This would be a model name in generated admin interface.
          Default is name of model class.
        - ``_list_fields`` or ``_detail_fields`` - list of fields which will be listed in entity list or detail view accordingly.
          Same as DRF serializers meta-attribute "fields".
        - ``_override_list_fields`` or ``_override_detail_fields`` - mapping with names and field types
          that will be redeclared in serializer attributes(think of it as declaring fields in DRF ModelSerializer).
        - ``_properties_groups`` - dict with key as group name and value as list of fields(str). Allows to
          group fields in sections on frontend.
        - ``_view_field_name`` - name of field frontend shows as main view name.
        - ``_non_bulk_methods`` - list of methods which must not used via bulk requests.
        - ``_extra_serializer_classes`` - mapping with additional serializers in viewset. For example, custom serializer,
          which will compute smth in action (mapping name). Value can be string for import.
          Important note: setting `model` attribute to None allows to use standard serializer generation mechanism
          and get fields from a list or detail serializer (set `__inject_from__` serializer's meta attribute to
          `list` or `detail` accordingly).
        - ``_filterset_fields`` - list/dict of filterset names for API-filtering. Default is list of fields in list view.
          During processing a list of fields checks for the presence of special field names and inherit additional
          parent classes. If the list contains ``id``, class will inherit from
          :class:`vstutils.api.filters.DefaultIDFilter`. If the list contains ``name``, class will inherit from
          :class:`vstutils.api.filters.DefaultNameFilter`. If both conditions are present, inheritance will be from all
          of the above classes.
          Possible values include `list` of fields to filter or `dict` where key is a field name and value is
          a Filter class. Dict extends attribute functionality and provides ability to override filter field class
          (None value disables overriding).
        - ``_search_fields`` - tuple or list of fields using for search requests.
          By default (or `None`) get all filterable fields in detail view.
        - ``_filter_backends`` - list of `vstutils.api.filter_backends.VSTFilterBackend` classes.
          Values can be string for import.
        - ``_override_filter_backends`` - boolean flag indicates that ``_filter_backends`` override default viewset
          filter_backends (otherwise appends). Default is ``False``.
        - ``_permission_classes`` - list of DRF permission classes. Values can be string for import.
        - ``_override_permission_classes`` - boolean flag indicates that ``_permission_classes`` override default
          viewset (otherwise appends). Default is ``False``.
        - ``_copy_attrs`` - list of model-instance attributes indicates that object is copiable with this attrs.
        - ``_nested`` - key-value mapping with nested views (key - nested name,
          kwargs for :class:`vstutils.api.decorators.nested_view` decorator but supports
          ``model`` attribute as nested). ``model`` can be string for import.

        .. note::
            You may need to create an
            `action <https://www.django-rest-framework.org/api-guide/viewsets/#marking-extra-actions-for-routing>`_
            on generated view. Use :class:`vstutils.models.decorators.register_view_action` decorator with the ``detail`` argument
            to determine applicability to a list or detail entry.
            In this case, the decorated method will take an instance of the view object as ``self`` attribute.

        .. note::
            In some cases, inheriting models may require to inherit Meta class from the base model.
            If the Meta is explicitly declared in the base class, then you can get it through
            the attribute `OriginalMeta` and use it for inheritance.

        .. note::
            Docstring of model will be reused for view descriptions. It is possible to write both a general description
            for all actions and description for each action using the following syntax:

            .. sourcecode::

                General description for all actions.

                action_name:
                    Description for this action.

                another_action:
                    Description for another action.
    """

    #: Primary field for select and search in API.
    id = models.AutoField(primary_key=True, max_length=20)
    #: If hidden is set to True, entry will be excluded from query in BQuerySet.
    hidden = models.BooleanField(default=False)
    hidden._hide = True  # pylint: disable=protected-access

    class Meta:
        abstract = True

    def __unicode__(self):
        return f"<{self.id}>"


@raise_context()
def bulk_notify_clients(channel="subscriptions_update", objects=()):
    for label, pk in objects:
        with raise_context():
            cent_client.add("publish", cent_client.get_publish_params(
                channel,
                {
                    "subscribe-label": label,
                    "pk": pk
                }
            ))
    if objects:  # pragma: no branch
        return cent_client.send()


@raise_context()
def notify_clients(model, pk=None):
    logger.debug(f'Notify clients about model update: {model._meta.label}')
    if not settings.CENTRIFUGO_CLIENT_KWARGS:
        return  # nocv
    bulk_notify_clients(
        "subscriptions_update",
        ((model._meta.label, pk),)
    )


def get_centrifugo_client():
    # pylint: disable=invalid-name,protected-access

    if not settings.CENTRIFUGO_CLIENT_KWARGS:
        return None

    centrifugo_client_kwargs = {**settings.CENTRIFUGO_CLIENT_KWARGS}
    centrifugo_client_kwargs.pop('token_hmac_secret_key', None)
    logger.debug(f"Getting Centrifugo client with kwargs: {centrifugo_client_kwargs}")
    client = CentrifugoClient(**centrifugo_client_kwargs)

    User = get_user_model()

    @receiver(signals.post_save)
    @receiver(signals.post_delete)
    def centrifugo_signal_for_notificate_users_about_updates(instance, *args, **kwargs):
        if isinstance(instance, (BModel, User)):
            notify_clients(instance.__class__, instance.pk)

    client._signal = centrifugo_signal_for_notificate_users_about_updates
    return client


cent_client = get_centrifugo_client()
