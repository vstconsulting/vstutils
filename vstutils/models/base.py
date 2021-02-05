# pylint: disable=no-member,no-classmethod-decorator,protected-access
from functools import lru_cache
from itertools import chain
from copy import deepcopy

from django_filters import rest_framework as filters, filterset
from django.db.models.base import ModelBase
from django.db.models.fields.related import ManyToManyField, OneToOneField
from django.utils.functional import SimpleLazyObject

from ..utils import import_class, apply_decorators, classproperty, get_if_lazy, raise_context_decorator_with_default
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
    # dict which indicates about properties groups
    "properties_groups": None,
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


def _ensure_pk_in_fields(model_class, fields):
    if fields is None:
        return
    fields = list(fields)
    primary_key_name = model_class._meta.pk.attname
    if primary_key_name not in fields:
        fields.insert(0, primary_key_name)
    return fields


def _import_class_if_string(value):
    if isinstance(value, str):
        return SimpleLazyObject(lambda: import_class(value))
    return value


def _get_setting_for_view(metatype, metadata, views):
    override = metadata[f'override_{metatype}']
    metadataobject = metadata[metatype]
    if metadataobject:
        metadataobject = list(map(_import_class_if_string, metadataobject))
    if override:
        return metadataobject  # nocv
    if metadataobject:
        for view in views:
            if hasattr(view, metatype):
                return list(chain(getattr(view, metatype), metadata[metatype]))
        return metadataobject  # nocv


def _get_decorator(data):
    path, deco_kwargs = data

    assert not ('model' in deco_kwargs and 'view' in deco_kwargs), (
        "Invalid model configuration: "
        f"Unable to set 'model' and 'view' at the same time for path [{path}]."
    )
    if 'model' in deco_kwargs:
        model = _import_class_if_string(deco_kwargs.pop('model'))
        assert isinstance(model, ModelBaseClass), (
            f"Invalid model type {type(model)} for path [{path}]."
        )
        deco_kwargs['view'] = model.lazy_generated_view
        if 'arg' not in deco_kwargs:
            deco_kwargs['arg'] = model._meta.pk.name
    return api_decorators.nested_view(path, **deco_kwargs)


class ApplyNestedDecorators(apply_decorators):
    def __init__(self, nested: dict):
        super().__init__(
            *map(_get_decorator, nested.items())
        )


class ModelBaseClass(ModelBase, metaclass=classproperty.meta):
    """
    Metaclass for all models.

    :ivar django.db.models.options.Options _meta:
    """

    def __new__(mcs, name, bases, attrs, **kwargs):
        if "__slots__" not in attrs:
            attrs['__slots__'] = ()
        if "__unicode__" in attrs and '__str__' not in attrs:
            attrs['__str__'] = _get_unicode
        extra_metadata: dict = {**default_extra_metadata}
        meta = None
        if "Meta" in attrs:
            meta = attrs['Meta']
            extra_metadata['proxy'] = getattr(meta, 'proxy', False)
            if not getattr(meta, 'abstract', False):
                for extra_name in filter(lambda y: hasattr(meta, y), map(lambda x: f'_{x}', extra_metadata.keys())):
                    extra_metadata[extra_name[1:]] = getattr(meta, extra_name)
        attrs['__extra_metadata__'] = deepcopy(extra_metadata)
        model_class = super(ModelBaseClass, mcs).__new__(mcs, name, bases, attrs, **kwargs)
        model_class.OriginalMeta = meta if meta is not None else model_class.Meta
        if hasattr(model_class, '__prepare_model__'):
            model_class.__prepare_model__()
        return model_class

    @classproperty
    @lru_cache()
    def generated_view(cls):
        # pylint: disable=no-value-for-parameter
        return cls.get_view_class()

    @classproperty
    @lru_cache()
    def lazy_generated_view(cls):
        # pylint: disable=unnecessary-lambda,no-value-for-parameter
        return SimpleLazyObject(lambda: cls.get_view_class())

    def get_serializer_class(cls, serializer_class, serializer_class_name=None, fields=None, field_overrides=None):
        # pylint: disable=no-value-for-parameter

        if serializer_class is None:
            serializer_class = api_serializers.VSTSerializer

        serializer_class = _import_class_if_string(serializer_class)

        serializer_class_name = cls.__name__ + 'Serializer' if serializer_class_name is None else serializer_class_name

        if fields:
            fields = list(fields)
        else:
            fields = SimpleLazyObject(lambda: [
                f.name for f in cls._meta.fields
                if not isinstance(f, (ManyToManyField, OneToOneField))
            ])

        meta = type('Meta', (), {
            'model': cls,
            'ref_name': serializer_class_name.replace('Serializer', ''),
            'fields': fields
        })

        serializer_class = get_if_lazy(serializer_class)
        properties_groups = cls.get_extra_metadata()['properties_groups']

        if properties_groups:
            schema_properties_groups = dict(**properties_groups)
        else:
            schema_properties_groups = None

        return type(serializer_class)(
            serializer_class_name,
            (serializer_class,),
            {
                "Meta": meta,
                "_schema_properties_groups": schema_properties_groups,
                **(field_overrides or {})
            }
        )

    def _update_serializers(cls, metadata: dict, serializers: dict):
        """
        Setup extra serializers.
        """
        for serializer_name, extra_serializer_class in (metadata['extra_serializer_classes'] or {}).items():
            if issubclass(extra_serializer_class, api_serializers.VSTSerializer) and \
                    getattr(extra_serializer_class.Meta, 'model', None) is None:
                inject_from = getattr(extra_serializer_class.Meta, '__inject_from__', None)
                extra_serializer_class = cls.get_serializer_class(  # pylint: disable=no-value-for-parameter
                    serializer_class=extra_serializer_class,
                    serializer_class_name=extra_serializer_class.__name__,
                    fields=_ensure_pk_in_fields(
                        cls,
                        getattr(extra_serializer_class.Meta, 'fields', None) or
                        metadata.get(f'{inject_from}_fields', None)
                    ),
                    field_overrides=metadata.get(f'override_{inject_from}_fields', None)
                )
            serializers[serializer_name] = extra_serializer_class

    def get_extra_metadata(cls):
        return cls.__extra_metadata__

    def get_list_serializer_name(cls):
        # pylint: disable=no-value-for-parameter
        serializer_class_name = cls.get_extra_metadata()['serializer_class_name']
        if serializer_class_name is None:
            serializer_class_name = cls.__name__ + 'Serializer'
        return serializer_class_name

    @raise_context_decorator_with_default(default=None)
    def _get_filterset_class(cls, filterset_fields, serializers):
        """
        Logic with generating filterset class. Returns `None` if class is not generated by any reason.
        """
        if filterset_fields == 'serializer':
            filterset_fields = serializers['serializer_class'].Meta.fields
            if not isinstance(filterset_fields, str):
                filterset_fields = tuple(filterset_fields)

        if filterset_fields:

            if isinstance(filterset_fields, dict):
                filterset_fields_list = tuple(filterset_fields.keys())
                filterset_fields_types = {k: v for k, v in filterset_fields.items() if v is not None}
            else:
                filterset_fields_list, filterset_fields_types = filterset_fields, {}

            class Meta:
                model = cls if not cls._meta.proxy else cls._meta.proxy_for_model
                fields = filterset_fields_list

            filter_base_classes = []
            if 'id' in filterset_fields_list:
                filter_base_classes.append(api_filters.DefaultIDFilter)
            if 'name' in filterset_fields_list:
                filter_base_classes.append(api_filters.DefaultNameFilter)
            if not filter_base_classes:
                filter_base_classes.append(filters.FilterSet)

            return filterset.FilterSetMetaclass(
                f'{cls.__name__}FilterSetClass',
                tuple(filter_base_classes),
                {'Meta': Meta, **filterset_fields_types}
            )

    def _get_view_class(cls, view_base_class):
        """
        Get one item of view base class for inheritance.
        """
        if view_base_class is None:
            return api_base.ModelViewSet
        elif view_base_class == 'read_only':
            return api_base.ReadOnlyModelViewSet
        elif view_base_class == 'list_only':
            return api_base.ListOnlyModelViewSet
        elif view_base_class == 'history':
            return api_base.HistoryModelViewSet  # nocv
        elif isinstance(view_base_class, str):
            return import_class(view_base_class)
        return view_base_class

    def get_view_class(cls):
        """
        Method which return autogenerated ViewSet based on model's Meta class.
        """
        # pylint: disable=no-value-for-parameter
        metadata = cls.get_extra_metadata()
        list_fields = _ensure_pk_in_fields(cls, metadata['list_fields'])
        detail_fields = _ensure_pk_in_fields(cls, metadata['detail_fields'] or list_fields)

        view_attributes = {'model': cls}

        serializer_class = metadata['serializer_class']
        serializers = {
            'serializer_class': cls.get_serializer_class(  # pylint: disable=no-value-for-parameter
                serializer_class=serializer_class,
                serializer_class_name=cls.get_list_serializer_name(),  # pylint: disable=no-value-for-parameter
                fields=list_fields,
                field_overrides=metadata['override_list_fields'] or {}
            )
        }
        detail_fields_override = metadata['override_detail_fields']
        if not detail_fields_override and not metadata['detail_fields']:
            detail_fields_override = metadata['override_list_fields']

        serializers['serializer_class_one'] = cls.get_serializer_class(  # pylint: disable=no-value-for-parameter
            serializer_class=serializer_class,
            serializer_class_name=f'One{serializers["serializer_class"].__name__}',
            fields=detail_fields,
            field_overrides=detail_fields_override or {}
        )
        cls._update_serializers(metadata, serializers)

        view_class_data = metadata['view_class']

        if not isinstance(view_class_data, (tuple, list)):
            view_class_data = (view_class_data,)

        view_class = [cls._get_view_class(v) for v in view_class_data]

        if metadata['copy_attrs']:
            view_attributes.update(map(lambda r: (f'copy_{r[0]}', r[1]), metadata['copy_attrs'].items()))
            view_class.append(api_base.CopyMixin)

        filterset_class = cls._get_filterset_class(metadata['filterset_fields'], serializers)
        if filterset_class is not None:
            view_attributes['filterset_class'] = filterset_class

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
