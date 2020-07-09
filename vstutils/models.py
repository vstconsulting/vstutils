# pylint: disable=no-member,no-classmethod-decorator,protected-access
"""
Default Django model classes overrided in `vstutils.models` module.
"""

from __future__ import unicode_literals
import inspect
from functools import lru_cache
from django_filters import rest_framework as filters
from django.db.models.base import ModelBase, Model
from django.db import models
from .utils import Paginator, import_class, apply_decorators, classproperty
from .api import (
    base as api_base,
    filters as api_filters,
    serializers as api_serializers,
    decorators as api_decorators
)


def _get_setting_for_view(metatype, metadata, views):
    override = metadata[f'override_{metatype}']
    metadataobject = metadata[metatype]
    if override:
        return metadataobject  # nocv
    if metadataobject:
        for view in views:
            if hasattr(view, metatype):
                return list(getattr(view, metatype)) + list(metadata[metatype])
        return metadataobject  # nocv


def is_class_method_or_function(obj):
    return inspect.isfunction(obj) or \
           inspect.ismethod(obj) or \
           isinstance(obj, type(is_class_method_or_function))


class ApplyNestedDecorators(apply_decorators):
    def __init__(self, nested: dict):
        super().__init__(
            *map(self.__get_decorator, nested.items())
        )

    def __get_decorator(self, data):
        path, deco_kwargs = data

        assert 'model' in deco_kwargs and 'view' not in deco_kwargs, (
            "Invalid model configuration: "
            f"Unable to set 'model' and 'view' at the same time for path [{path}]."
        )
        if 'model' in deco_kwargs:
            model = deco_kwargs.pop('model')
            assert isinstance(model, ModelBaseClass), (
                f"Invalid model type {type(model)} for path [{path}]."
            )
            deco_kwargs['view'] = model.generated_view
            if 'arg' not in deco_kwargs:
                deco_kwargs['arg'] = model._meta.pk.name
        return api_decorators.nested_view(path, **deco_kwargs)


class BQuerySet(models.QuerySet):
    """
    Represent a lazy database lookup for a set of objects.
    Allows to override default iterable class by `custom_iterable_class` attr.
    """

    use_for_related_fields = True

    @property
    def _iterable_class(self):
        if hasattr(self, '__iterable_class__'):
            return self.__iterable_class__
        if hasattr(self, 'custom_iterable_class'):
            self.__iterable_class__ = self.custom_iterable_class
        return self._iterable_class

    @_iterable_class.setter
    def _iterable_class(self, value):
        if not hasattr(self, 'custom_iterable_class'):
            self.__iterable_class__ = value

    @_iterable_class.deleter
    def _iterable_class(self):  # nocv
        del self.__iterable_class__

    def paged(self, *args, **kwargs):
        """
        Returns paginated data with custom Paginator-class.
        By default, uses `PAGE_LIMIT` from global settings.
        """
        return self.get_paginator(*args, **kwargs).items()

    def get_paginator(self, *args, **kwargs):
        return Paginator(self.filter(), *args, **kwargs)

    def cleared(self):
        """
        Filter queryset for models with attribute 'hidden' and
        exclude all hidden objects.
        """
        if hasattr(self.model, "hidden"):
            return self.filter(hidden=False)
        return self

    def _find(self, field_name, tp_name, *args, **kwargs):  # nocv
        field = kwargs.get(field_name, None) or (list(args)[0:1]+[None])[0]
        if field is None:
            return self
        if isinstance(field, list):
            return getattr(self, tp_name)(**{field_name+"__in": field})
        return getattr(self, tp_name)(**{field_name: field})

    def as_manager(cls):
        manager = BaseManager.from_queryset(cls)()
        manager._built_with_as_manager = True
        return manager
    as_manager.queryset_only = True
    as_manager = classmethod(as_manager)


class BaseManager(models.Manager):

    @classmethod
    def _get_queryset_methods(cls, queryset_class):
        """
        Django overrloaded method for add cyfunction.
        """
        def create_method(name, method):  # nocv
            def manager_method(self, *args, **kwargs):
                return getattr(self.get_queryset(), name)(*args, **kwargs)

            manager_method.__name__ = method.__name__
            manager_method.__doc__ = method.__doc__
            return manager_method

        orig_method = models.Manager._get_queryset_methods
        new_methods = orig_method(queryset_class)
        for name, method in inspect.getmembers(queryset_class, predicate=is_class_method_or_function):
            # Only copy missing methods.
            if hasattr(cls, name) or name in new_methods:
                continue
            queryset_only = getattr(method, 'queryset_only', None)
            if queryset_only or (queryset_only is None and name.startswith('_')):
                continue
            # Copy the method onto the manager.
            new_methods[name] = create_method(name, method)  # nocv
        return new_methods


class Manager(BaseManager.from_queryset(BQuerySet)):
    """
    Default VSTUtils manager. Used by `BaseModel` and `BModel`.
    Allows to use managers and querysets with cyfunctions-members.
    """


class ModelBaseClass(ModelBase):
    def __new__(mcs, name, bases, attrs, **kwargs) -> Model:
        if "__slots__" not in attrs:
            attrs['__slots__'] = tuple()
        if "__unicode__" in attrs and '__str__' not in attrs:
            attrs['__str__'] = lambda x: x.__unicode__()
        extra_metadata: dict = {
            # list or class which is base for view
            "view_class": None,
            # base class for serializers
            "serializer_class": None,
            # name of openapi model
            "serializer_class_name": None,
            # tuple or list of fields in list view
            "list_fields": None,
            # dict which override fields types of list view serializer
            "override_list_fields": dict(),
            # tuple or list of fields in detail view
            "detail_fields": None,
            # dict which override fields types of detail view serializer
            "override_detail_fields": dict(),
            # key-value of actions serializers (key - action, value - serializer class)
            "extra_serializer_classes": dict(),
            # tuple or list of filters on list
            "filterset_fields": 'serializer',
            # tuple or list of filter backends for queryset
            "filter_backends": None,
            # allow to full override of the filter backends default list
            "override_filter_backends": False,
            # tuple or list of permission_classes for the view
            "permission_classes": None,
            # allow to override the default permission_classes
            "override_permission_classes": False,
            # additional attrs which means that this view allowed to copy elements
            "copy_attrs": dict(),
            # key-value mapping with nested views (key - nested name, kwargs for nested decorator)
            "nested": {}
        }
        if "Meta" in attrs:
            meta = attrs['Meta'].__dict__
            for extra_name in filter(lambda y: y in meta, map(lambda x: f'_{x}', extra_metadata.keys())):
                extra_metadata[extra_name[1:]] = meta[extra_name]
        attrs['__extra_metadata__'] = extra_metadata
        model_class: Model = super(ModelBaseClass, mcs).__new__(mcs, name, bases, attrs, **kwargs)
        if hasattr(model_class, '__prepare_model__'):
            model_class.__prepare_model__()
        model_class.__extra_metadata__ = extra_metadata
        queryset_class = getattr(getattr(model_class, 'objects', None), '_queryset_class', None)
        if queryset_class and not issubclass(queryset_class, BQuerySet):
            manager = Manager()
            manager.auto_created = True
            model_class.add_to_class('objects', manager)
        return model_class

    @classproperty
    @lru_cache()
    def generated_view(cls):
        # pylint: disable=no-value-for-parameter
        return cls.get_view_class()

    def get_serializer_class(cls, serializer_class, serializer_class_name=None, fields=None, field_overrides=None):
        if serializer_class is None:
            serializer_class = api_serializers.VSTSerializer

        if serializer_class_name is None:
            serializer_class_name = cls.__name__ + 'Serializer'

        if fields:
            fields = list(fields)
        else:
            fields = '__all__'

        class SerializerClass(serializer_class):
            class Meta:
                model = cls
                ref_name = serializer_class_name.replace('Serializer', '')

        for attr_name, attr_value in field_overrides.items():
            SerializerClass._declared_fields[attr_name] = attr_value

        SerializerClass.__name__ = serializer_class_name
        setattr(SerializerClass.Meta, 'fields', fields)

        return SerializerClass

    def get_view_class(cls):
        metadata = cls.__extra_metadata__

        view_attributes = dict(model=cls)

        serializer_class = metadata['serializer_class']
        serializers = dict(
            serializer_class=cls.get_serializer_class(  # pylint: disable=no-value-for-parameter
                serializer_class=serializer_class,
                serializer_class_name=metadata['serializer_class_name'],
                fields=metadata['list_fields'],
                field_overrides=metadata['override_list_fields']
            )
        )
        detail_fields_override = metadata['override_detail_fields'] or None
        if not detail_fields_override and not metadata['detail_fields']:
            detail_fields_override = metadata['override_list_fields']

        serializers['serializer_class_one'] = cls.get_serializer_class(  # pylint: disable=no-value-for-parameter
            serializer_class=serializer_class,
            serializer_class_name=f'One{serializers["serializer_class"].__name__}',
            fields=metadata['detail_fields'] or metadata['list_fields'],
            field_overrides=detail_fields_override
        )
        serializers.update(map(lambda k, v: (f'serializer_class_{k}', v), metadata['extra_serializer_classes'].items()))

        view_class = metadata['view_class']
        if view_class is None:
            view_class = api_base.ModelViewSet
        if view_class == 'read_only':
            view_class = api_base.ReadOnlyModelViewSet
        elif view_class == 'history':
            view_class = api_base.HistoryModelViewSet  # nocv
        elif isinstance(view_class, str):
            view_class = import_class(view_class)

        if not isinstance(view_class, (tuple, list)):
            view_class = (view_class,)

        view_class = list(view_class)

        if metadata['copy_attrs']:
            view_attributes.update(map(lambda r: (f'copy_{r[0]}', r[1]), metadata['copy_attrs'].items()))
            view_class.append(api_base.CopyMixin)

        filterset_fields = metadata['filterset_fields']
        if filterset_fields == 'serializer':
            filterset_fields = tuple(serializers['serializer_class']._declared_fields.keys())

        if filterset_fields:
            base_filter_class = api_filters.DefaultIDFilter if 'id' in filterset_fields else filters.FilterSet

            class FilterSetClass(base_filter_class):
                class Meta:
                    model = cls
                    fields = filterset_fields

            view_attributes['filterset_class'] = FilterSetClass

        for metatype in ['permission_classes', 'filter_backends']:
            metaobject = _get_setting_for_view(metatype, metadata, view_class)
            if metaobject:
                view_attributes[metatype] = metaobject

        generated_view = type(
            f'{cls.__name__}ViewSet',
            tuple(view_class),
            {**view_attributes, **serializers}
        )
        return ApplyNestedDecorators(metadata['nested'])(generated_view)


class BaseModel(Model, metaclass=ModelBaseClass):

    class Meta:
        abstract = True

    @classmethod
    def __prepare_model__(cls):
        pass


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
