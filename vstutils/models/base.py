# pylint: disable=no-member,no-classmethod-decorator,protected-access
from functools import lru_cache

from django_filters import rest_framework as filters, filterset
from django.db.models.base import ModelBase

from ..utils import import_class, apply_decorators, classproperty
from ..api import (
    base as api_base,
    filters as api_filters,
    serializers as api_serializers,
    decorators as api_decorators
)


default_extra_metadata: dict = {
    # list or class which is base for view
    "view_class": None,
    # base class for serializers
    "serializer_class": None,
    # name of openapi model
    "serializer_class_name": None,
    # tuple or list of fields in list view
    "list_fields": None,
    # dict which override fields types of list view serializer
    "override_list_fields": None,
    # tuple or list of fields in detail view
    "detail_fields": None,
    # dict which override fields types of detail view serializer
    "override_detail_fields": None,
    # key-value of actions serializers (key - action, value - serializer class)
    "extra_serializer_classes": None,
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
    "copy_attrs": None,
    # key-value mapping with nested views (key - nested name, kwargs for nested decorator)
    "nested": None
}


def _get_unicode(obj):
    return obj.__unicode__()


def _import_class_if_string(value):
    if isinstance(value, str):
        return import_class(value)
    return value


def _get_setting_for_view(metatype, metadata, views):
    override = metadata[f'override_{metatype}']
    metadataobject = metadata[metatype]
    if metadataobject:
        metadataobject = [_import_class_if_string(i) for i in metadataobject]
    if override:
        return metadataobject  # nocv
    if metadataobject:
        for view in views:
            if hasattr(view, metatype):
                return list(getattr(view, metatype)) + list(metadata[metatype])
        return metadataobject  # nocv


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
            model = _import_class_if_string(deco_kwargs.pop('model'))
            assert isinstance(model, ModelBaseClass), (
                f"Invalid model type {type(model)} for path [{path}]."
            )
            deco_kwargs['view'] = model.generated_view
            if 'arg' not in deco_kwargs:
                deco_kwargs['arg'] = model._meta.pk.name
        return api_decorators.nested_view(path, **deco_kwargs)


class ModelBaseClass(ModelBase):
    """Metaclass for all models."""

    def __new__(mcs, name, bases, attrs, **kwargs):
        if "__slots__" not in attrs:
            attrs['__slots__'] = ()
        if "__unicode__" in attrs and '__str__' not in attrs:
            attrs['__str__'] = _get_unicode
        extra_metadata: dict = {**default_extra_metadata}
        if "Meta" in attrs:
            meta = attrs['Meta']
            if not getattr(meta, 'abstract', False):
                for extra_name in filter(lambda y: hasattr(meta, y), map(lambda x: f'_{x}', extra_metadata.keys())):
                    extra_metadata[extra_name[1:]] = getattr(meta, extra_name)
        attrs['__extra_metadata__'] = extra_metadata
        model_class = super(ModelBaseClass, mcs).__new__(mcs, name, bases, attrs, **kwargs)
        if hasattr(model_class, '__prepare_model__'):
            model_class.__prepare_model__()
        return model_class

    @classproperty
    @lru_cache()
    def generated_view(cls):
        # pylint: disable=no-value-for-parameter
        return cls.get_view_class()

    def get_serializer_class(cls, serializer_class, serializer_class_name=None, fields=None, field_overrides=None):
        if serializer_class is None:
            serializer_class = api_serializers.VSTSerializer

        serializer_class = _import_class_if_string(serializer_class)

        if serializer_class_name is None:
            serializer_class_name = cls.__name__ + 'Serializer'

        if fields:
            fields = list(fields)
        else:
            fields = [f.name for f in cls._meta.get_fields()]

        meta = type('Meta', (), {
            'model': cls,
            'ref_name': serializer_class_name.replace('Serializer', ''),
            'fields': fields
        })

        return type(serializer_class)(
            serializer_class_name,
            (serializer_class,),
            {"Meta": meta, **field_overrides}
        )

    def get_extra_metadata(cls):
        return cls.__extra_metadata__

    def get_view_class(cls):
        # pylint: disable=too-many-branches,too-many-statements
        metadata = cls.get_extra_metadata()  # pylint: disable=no-value-for-parameter

        view_attributes = dict(model=cls)

        serializer_class = metadata['serializer_class']
        serializers = dict(
            serializer_class=cls.get_serializer_class(  # pylint: disable=no-value-for-parameter
                serializer_class=serializer_class,
                serializer_class_name=metadata['serializer_class_name'],
                fields=metadata['list_fields'],
                field_overrides=metadata['override_list_fields'] or {}
            )
        )
        detail_fields_override = metadata['override_detail_fields']
        if not detail_fields_override and not metadata['detail_fields']:
            detail_fields_override = metadata['override_list_fields']

        serializers['serializer_class_one'] = cls.get_serializer_class(  # pylint: disable=no-value-for-parameter
            serializer_class=serializer_class,
            serializer_class_name=f'One{serializers["serializer_class"].__name__}',
            fields=metadata['detail_fields'] or metadata['list_fields'],
            field_overrides=detail_fields_override or {}
        )
        serializers.update(map(
            lambda k, v: (f'serializer_class_{k}', _import_class_if_string(v)),
            (metadata['extra_serializer_classes'] or {}).items()
        ))

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
            filterset_fields = serializers['serializer_class'].Meta.fields
            if not isinstance(filterset_fields, str):
                filterset_fields = tuple(filterset_fields)

        if filterset_fields:

            if isinstance(filterset_fields, dict):
                filterset_fields_list = tuple(filterset_fields.keys())
                filterset_fields_types = filterset_fields
            else:
                filterset_fields_list = filterset_fields
                filterset_fields_types = {}

            class Meta:
                model = cls
                fields = filterset_fields_list

            filter_base_classes = []
            if 'id' in filterset_fields_list:
                filter_base_classes.append(api_filters.DefaultIDFilter)
            if 'name' in filterset_fields_list:
                filter_base_classes.append(api_filters.DefaultNameFilter)
            if not filter_base_classes:
                filter_base_classes.append(filters.FilterSet)

            view_attributes['filterset_class'] = filterset.FilterSetMetaclass(
                f'{cls.__name__}FilterSetClass',
                tuple(filter_base_classes),
                {'Meta': Meta, **filterset_fields_types}
            )

        for metatype in ('permission_classes', 'filter_backends'):
            metaobject = _get_setting_for_view(metatype, metadata, view_class)
            if metaobject:
                view_attributes[metatype] = metaobject

        generated_view = type(
            f'{cls.__name__}ViewSet',
            tuple(view_class),
            {
                **view_attributes,
                **serializers,
                **dict(filter(lambda x: hasattr(x[1], '_append_to_view'), vars(cls).items()))
            }
        )

        return apply_decorators(
            *map(_import_class_if_string, getattr(cls, 'generated_view_decorators', []))
        )(ApplyNestedDecorators(metadata['nested'] or {})(generated_view))
