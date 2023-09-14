# cython: binding=True
# pylint: disable=no-member,no-classmethod-decorator,protected-access
import operator
import uuid
from functools import lru_cache, partial, reduce
from itertools import chain
from copy import deepcopy

from django_filters import rest_framework as filters, filterset
from django.core.cache import caches as django_caches
from django.core.cache.backends.base import DEFAULT_TIMEOUT as DEFAULT_CACHE_TIMEOUT
from django.db.models.base import ModelBase
from django.db.models import fields as django_model_fields
from django.db.models.fields.related import ManyToManyField, OneToOneField, ForeignKey
from django.utils.functional import SimpleLazyObject, lazy
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from rest_framework.fields import ModelField, JSONField, CharField as drfCharField, ChoiceField
from rest_framework.mixins import CreateModelMixin, UpdateModelMixin, DestroyModelMixin
from vstutils.utils import translate as _

from ..gui.context import gui_version
from ..api.fields import (
    NamedBinaryFileInJsonField,
    NamedBinaryImageInJsonField,
    MultipleNamedBinaryFileInJsonField,
    MultipleNamedBinaryImageInJsonField,
    FkField,
    PasswordField,
    RelatedListField,
)
from ..utils import (
    import_class,
    apply_decorators,
    classproperty,
    get_if_lazy,
    raise_context_decorator_with_default,
)
from ..api import (
    base as api_base,
    filters as api_filters,
    serializers as api_serializers,
    decorators as api_decorators,
)
from ..api.filter_backends import DeepViewFilterBackend

# Constants
LAZY_MODEL = object()
DEFAULT_VIEW_FIELD_NAMES = (
    'name',
    'title',
    'username',
    'email',
    'key',
)
EXCLUDED_FIELDS = (
    NamedBinaryFileInJsonField,
    NamedBinaryImageInJsonField,
    MultipleNamedBinaryFileInJsonField,
    MultipleNamedBinaryImageInJsonField,
    ModelField,
    JSONField,
    PasswordField,
    RelatedListField,
)
CHANGE_MIXINS = (
    CreateModelMixin,
    UpdateModelMixin,
    DestroyModelMixin
)

view_settings = (
    'filter_backends',
    'permission_classes',
    'authentication_classes',
    'throttle_classes',
    'renderer_classes',
    'parser_classes',
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
    # name of default view field
    "view_field_name": None,
    # list or tuple of non-bulk methods from gui
    "non_bulk_methods": None,
    # dict which indicates about properties groups
    "properties_groups": None,
    # key-value of actions serializers (key - action, value - serializer class)
    "extra_serializer_classes": None,
    # tuple or list of filters on list
    "filterset_fields": 'serializer',
    # tuple or list of fields using for search requests
    "search_fields": None,
    # additional attrs which means that this view allowed to copy elements
    "copy_attrs": None,
    # key-value mapping with nested views (key - nested name, kwargs for nested decorator)
    "nested": None,
    # additional view's settings
    **dict(reduce(operator.add, [((f'pre_{i}', None), (i, None), (f'override_{i}', False)) for i in view_settings])),
    "extra_view_attributes": None,
    # if true - view will be hidden on frontend
    "hidden": False,
}


# Handlers
def _translate_search_help_text(field_name, related_name):
    return _("Search by {}'s primary key or {}").format(_(field_name), _(related_name))


def is_append_to_view(item):
    return bool(getattr(item[1], '_append_to_view', False))


def is_inherit_append_to_view(item):
    return bool(getattr(item[1], '_inherit', False)) and is_append_to_view(item)


def get_append_to_view(items, handler=is_append_to_view):
    return dict(filter(handler, items))


def get_parents_append_to_view(mro_items):
    result = {}
    for items in reversed(list(mro_items)):
        result.update(get_append_to_view(items, is_inherit_append_to_view))
    return result


def get_first_match_name(field_names, default=None):
    return next(
        (i for i in field_names if i in DEFAULT_VIEW_FIELD_NAMES),
        next(iter(field_names[1:]), default)
    )


def _get_unicode(obj):
    return obj.__unicode__()


def _ensure_pk_in_fields(model_class, fields):
    if fields is None or fields == '__all__':
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


def _load_settings_for_view(metadataobject):
    return list(map(_import_class_if_string, metadataobject))


def _get_setting_for_view(metatype, metadata, views):
    override = metadata[f'override_{metatype}']
    metadataobject = metadata[metatype] or []
    if metadataobject:
        metadataobject = _load_settings_for_view(metadataobject)
    pre_metadataobject = metadata[f'pre_{metatype}'] or []
    if override:
        return pre_metadataobject + metadataobject  # nocv
    if metadataobject or pre_metadataobject:
        for view in views:
            if hasattr(view, metatype):  # pragma: no branch
                return list(chain(pre_metadataobject, getattr(view, metatype), metadataobject))
        return pre_metadataobject + metadataobject  # nocv


def _result_with_arg_decorator(func):
    def wrapper(*args, **kwargs):
        return (func(*args, **kwargs), *args)

    return wrapper


def _bool_first(item):
    return item and item[0] is not None


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
    else:
        deco_kwargs['view'] = _import_class_if_string(deco_kwargs.pop('view'))
    return api_decorators.nested_view(path, **deco_kwargs)


def get_proxy_labels(model):
    labels = []
    if model._meta.proxy:
        labels.append(model._meta.proxy_for_model._meta.label)
        labels += get_proxy_labels(model._meta.proxy_for_model)
    return labels


# Classes
class ApplyNestedDecorators(apply_decorators):
    def __init__(self, nested: dict):
        super().__init__(
            *map(_get_decorator, nested.items())
        )


class ModelBaseClass(ModelBase, metaclass=classproperty.meta):
    """
    Metaclass for all models. Read more in :class:`vstutils.models.BModel`
    """

    def __new__(mcs, name, bases, attrs, **kwargs):
        if "__unicode__" in attrs and '__str__' not in attrs:
            attrs['__str__'] = _get_unicode
        extra_metadata: dict = {**default_extra_metadata}
        meta = None
        if "Meta" in attrs:
            meta = attrs['Meta']
            extra_metadata['proxy'] = getattr(meta, 'proxy', False)
            if not getattr(meta, 'abstract', False):
                for extra_name in filter(lambda y: hasattr(meta, y), (f'_{x}' for x in extra_metadata.keys())):
                    extra_metadata[extra_name[1:]] = getattr(meta, extra_name)
        attrs['__extra_metadata__'] = deepcopy(extra_metadata)
        model_class = super(ModelBaseClass, mcs).__new__(mcs, name, bases, attrs, **kwargs)
        model_class.OriginalMeta = meta if meta is not None else model_class.Meta
        if hasattr(model_class, '__prepare_model__'):
            model_class.__prepare_model__()
        if getattr(model_class, '_cache_responses', False):
            receiver(post_save, sender=model_class)(model_class.update_cache_for_model_signal)
            receiver(post_delete, sender=model_class)(model_class.update_cache_for_model_signal)
            cache_related_labels = getattr(model_class, '_cache_related_labels', ())
            update_cache_for_model_related = partial(
                model_class.update_cache_for_model_signal,
                cached_model_class=model_class
            )
            for label in cache_related_labels:
                receiver(post_save, sender=label)(update_cache_for_model_related)
                receiver(post_delete, sender=label)(update_cache_for_model_related)
        return model_class

    def update_cache_for_model_signal(cls, instance, **kwargs):
        # pylint: disable=no-value-for-parameter
        cached_model_class = kwargs.get('cached_model_class', instance.__class__)
        cached_model_class.set_etag_value(cls.get_keys_for_etag_update(instance, cached_model_class))

    def get_keys_for_etag_update(cls, instance, signal_model_class):
        if isinstance(instance, signal_model_class):
            return {instance.pk}

    def get_proxy_labels(cls):
        return get_proxy_labels(cls)  # nocv

    def get_api_cache_name(cls, postfix=None, _postfix=None):
        if postfix not in {None, '__postfix__'}:
            postfix = f'{cls.get_etag_value("__postfix__") if _postfix is None else _postfix}_{postfix}'
        return f'etag_table_{cls._meta.db_table}' + (f'_{postfix}' if postfix is not None else "")

    def get_etag_value(cls, pk=None):
        # pylint: disable=no-value-for-parameter
        return str(
            django_caches['etag'].get_or_set(
                cls.get_api_cache_name(pk),
                str(uuid.uuid4()),
                timeout=getattr(cls, '_cache_responses_timeout', DEFAULT_CACHE_TIMEOUT),
                version=gui_version,
            )
        )

    def set_etag_value(cls, pk=None):
        # pylint: disable=no-value-for-parameter
        new_value = str(uuid.uuid4())
        keys = [cls.get_api_cache_name()]
        if pk is None:
            keys.append(cls.get_api_cache_name("__postfix__"))
        else:
            _postfix = cls.get_etag_value("__postfix__")
            keys += [
                cls.get_api_cache_name(i, _postfix=_postfix)
                for i in (pk if isinstance(pk, (tuple, list, set)) else (pk,))
                if i is not None
            ]

        django_caches['etag'].set_many(
            {k: new_value for k in keys},
            timeout=getattr(cls, '_cache_responses_timeout', DEFAULT_CACHE_TIMEOUT),
            version=gui_version,
        )
        return new_value

    @classproperty
    @lru_cache()
    def generated_view(cls):
        # pylint: disable=no-value-for-parameter
        return cls.get_view_class()

    @classproperty
    @lru_cache()
    def lazy_generated_view(cls, **extra_metadata):
        # pylint: disable=unnecessary-lambda,no-value-for-parameter
        return SimpleLazyObject(lambda: cls.get_view_class(**extra_metadata))

    def get_model_fields_mapping(cls, filter_handler=lambda f: True, fields_getter=None):
        fields_getter = fields_getter if fields_getter is not None else lambda: cls._meta.fields
        return {
            f.name: f
            for f in fields_getter()
            if filter_handler(f)
        }

    def get_all_view_fields_lazy(cls):
        return SimpleLazyObject(
            lambda: tuple(cls.get_model_fields_mapping(
                lambda f: not isinstance(f, (ManyToManyField, OneToOneField)) and not getattr(f, '_hide', False)
            ).keys())
        )

    def get_serializer_class(  # noqa: CFQ002
            cls,
            serializer_class,
            serializer_class_name=None,
            fields=None,
            field_overrides=None,
            view_field_name=None,
            non_bulk_methods=None,
            metadata=None,
    ):
        # pylint: disable=no-value-for-parameter,too-many-arguments
        attributes = {}

        if view_field_name:
            attributes['_view_field_name'] = view_field_name

        if serializer_class is None:
            serializer_class = api_serializers.VSTSerializer

        serializer_class = _import_class_if_string(serializer_class)

        serializer_class_name = cls.__name__ + 'Serializer' if serializer_class_name is None else serializer_class_name

        if fields and fields != '__all__':
            fields = list(fields)
        else:
            fields = cls.get_all_view_fields_lazy()

        meta = type('Meta', (), {
            'model': cls,
            'ref_name': serializer_class_name.replace('Serializer', ''),
            'fields': fields
        })

        serializer_class = get_if_lazy(serializer_class)
        properties_groups = (metadata if isinstance(metadata, dict) else cls.get_extra_metadata())['properties_groups']
        translate_model = getattr(cls, '_translate_model', None)

        if properties_groups:
            attributes['_schema_properties_groups'] = dict(**properties_groups)

        if non_bulk_methods:
            attributes['_non_bulk_methods'] = non_bulk_methods

        if translate_model:
            attributes['_translate_model'] = translate_model

        return api_serializers.update_declared_fields(type(serializer_class)(
            serializer_class_name,
            (serializer_class,),
            {
                "Meta": meta,
                **attributes,
                **(field_overrides or {})
            }
        ))

    def _update_serializers(cls, metadata: dict, serializers: dict):
        """
        Setup extra serializers.
        """
        for serializer_name, extra_serializer_class in (metadata['extra_serializer_classes'] or {}).items():
            if issubclass(extra_serializer_class, api_serializers.VSTSerializer) and \
                    getattr(extra_serializer_class.Meta, 'model', None) is None:
                inject_from = getattr(extra_serializer_class.Meta, '__inject_from__', None)
                field_overrides = {
                    n: f
                    for n, f in (metadata.get(f'override_{inject_from}_fields', {}) or {}).items()
                    if extra_serializer_class._declared_fields.get(n, None) is None
                } or None
                extra_serializer_class = cls.get_serializer_class(  # pylint: disable=no-value-for-parameter
                    serializer_class=extra_serializer_class,
                    serializer_class_name=extra_serializer_class.__name__,
                    fields=_ensure_pk_in_fields(
                        cls,
                        getattr(extra_serializer_class.Meta, 'fields', None) or
                        metadata.get(f'{inject_from}_fields', None)
                    ),
                    field_overrides=field_overrides,
                    view_field_name=(
                        metadata['view_field_name']
                        if inject_from is not None
                        else getattr(extra_serializer_class, '_view_field_name', None)
                    ),
                    non_bulk_methods=(
                        getattr(extra_serializer_class, '_non_bulk_methods', None) or metadata['non_bulk_methods']
                        if inject_from is not None and metadata['non_bulk_methods']
                        else getattr(extra_serializer_class, '_non_bulk_methods', None)
                    ),
                    metadata=metadata,
                )
            elif issubclass(extra_serializer_class, api_serializers.VSTSerializer) and \
                    getattr(extra_serializer_class.Meta, 'model', None) is LAZY_MODEL:
                meta_class = type(extra_serializer_class.Meta)(
                    'Meta',
                    (extra_serializer_class.Meta,),
                    {'model': cls}
                )
                extra_serializer_class = type(extra_serializer_class)(
                    extra_serializer_class.__name__,
                    (extra_serializer_class,),
                    {'Meta': meta_class}
                )
            serializers[serializer_name] = api_serializers.update_declared_fields(extra_serializer_class)

    def get_extra_metadata(cls):
        return cls.__extra_metadata__.copy()

    def get_list_serializer_name(cls, metadata=None):
        # pylint: disable=no-value-for-parameter
        serializer_class_name = (metadata or cls.get_extra_metadata())['serializer_class_name']
        if serializer_class_name is None:
            serializer_class_name = cls.__name__ + 'Serializer'
        return serializer_class_name

    @raise_context_decorator_with_default(default=None)
    def _get_filterset_class(cls, filterset_fields, serializers):
        """
        Logic with generating filterset class. Returns `None` if class is not generated by any reason.
        """
        if filterset_fields == 'serializer':
            serializer = serializers['serializer_class']
            filterset_fields = serializer.Meta.fields

            if not isinstance(filterset_fields, str):  # pragma: no branch
                model_fields = tuple(cls.get_model_fields_mapping().keys())  # pylint: disable=no-value-for-parameter
                # fields are added to tuple if field in model_fields and not in EXCLUDED_FIELDS
                filterset_fields = tuple(
                    f for f in filterset_fields if f in model_fields and
                    not isinstance(serializer().fields.get(f), EXCLUDED_FIELDS)
                )

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

            iteration_filter_handler = (
                lambda f: f.name not in filterset_fields_types and f.name in filterset_fields_list
            )
            serializer = serializers['serializer_class']()
            for field_name, field in cls.get_model_fields_mapping(iteration_filter_handler).items():
                if isinstance(field, ForeignKey):
                    related_name = get_first_match_name([
                        f.name
                        for f in field.related_model._meta.fields
                        if isinstance(f, django_model_fields.CharField)
                    ])
                    filterset_fields_types[field_name] = api_filters.CharFilter(
                        method=api_filters.FkFilterHandler(
                            related_pk=field.target_field.attname,
                            related_name=related_name
                        ),
                        help_text=lazy(_translate_search_help_text)(field_name, related_name)
                    )
                elif isinstance(field, django_model_fields.BooleanField):
                    filterset_fields_types[field_name] = filters.BooleanFilter()
                elif isinstance(serializer.fields.get(field_name), ChoiceField):
                    filterset_fields_types[field_name] = filters.ChoiceFilter(
                        choices=tuple(serializer.fields.get(field_name).choices.items())
                    )

            return filterset.FilterSetMetaclass(
                f'{cls.__name__}FilterSetClass',
                tuple(filter_base_classes),
                {'Meta': Meta, **filterset_fields_types}
            )

    def _get_search_fields(cls, serializer, fields=None):
        if fields is not None:
            yield from fields
        else:
            model_fields = cls.get_model_fields_mapping()  # pylint: disable=no-value-for-parameter
            serializer_fields = serializer().fields
            avail_fields = filter(
                tuple(model_fields.keys()).__contains__,
                tuple(
                    k if v.source is None or v.source == '*' else v.source
                    for k, v in serializer_fields.items()
                    if not isinstance(v, EXCLUDED_FIELDS)
                )
            )
            for field in avail_fields:
                serializer_field = serializer_fields[field]
                if isinstance(serializer_field, FkField):
                    yield f'{field}__{serializer_field.autocomplete_represent}'
                elif isinstance(serializer_field, drfCharField):
                    yield field

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

    def get_view_class(cls, **extra_options):  # noqa: CFQ001
        """
        Method which return autogenerated ViewSet based on model's Meta class.
        """
        # pylint: disable=no-value-for-parameter
        metadata = cls.get_extra_metadata()
        metadata.update(extra_options)
        list_fields = _ensure_pk_in_fields(cls, metadata['list_fields'])
        detail_fields = _ensure_pk_in_fields(cls, metadata['detail_fields'] or list_fields)

        view_attributes = {'model': cls, **(metadata['extra_view_attributes'] or {})}
        if metadata['hidden']:
            view_attributes['hidden'] = True

        serializer_class = metadata['serializer_class']
        serializers = {
            'serializer_class': cls.get_serializer_class(  # pylint: disable=no-value-for-parameter
                serializer_class=serializer_class,
                serializer_class_name=cls.get_list_serializer_name(metadata),  # pylint: disable=no-value-for-parameter
                fields=list_fields,
                field_overrides=metadata['override_list_fields'] or {},
                view_field_name=metadata['view_field_name'],
                non_bulk_methods=metadata['non_bulk_methods'],
                metadata=metadata,
            )
        }
        detail_fields_override = metadata['override_detail_fields']
        if not detail_fields_override and not metadata['detail_fields']:
            detail_fields_override = metadata['override_list_fields']

        serializers['serializer_class_one'] = cls.get_serializer_class(  # pylint: disable=no-value-for-parameter
            serializer_class=serializer_class,
            serializer_class_name=f'One{serializers["serializer_class"].__name__}',
            fields=detail_fields,
            field_overrides=detail_fields_override or {},
            view_field_name=metadata['view_field_name'],
            non_bulk_methods=metadata['non_bulk_methods'],
            metadata=metadata,
        )
        cls._update_serializers(metadata, serializers)

        view_class_data = metadata['view_class']

        if not isinstance(view_class_data, (tuple, list)):
            view_class_data = (view_class_data,)

        view_class = [cls._get_view_class(v) for v in view_class_data]
        if getattr(cls, '_cache_responses', False):
            view_class.insert(0, api_base.CachableHeadMixin)

        if metadata['copy_attrs']:
            view_attributes.update(((f'copy_{r[0]}', r[1]) for r in metadata['copy_attrs'].items()))
            view_class.append(api_base.CopyMixin)

        filterset_class = cls._get_filterset_class(metadata['filterset_fields'], serializers)
        if filterset_class is not None:
            view_attributes['filterset_class'] = filterset_class

        if hasattr(cls, 'deep_parent_field'):
            metadata['pre_filter_backends'] = metadata['pre_filter_backends'] or []
            metadata['pre_filter_backends'].insert(0, DeepViewFilterBackend)

        get_setting_for_view = partial(
            _result_with_arg_decorator(_get_setting_for_view),
            metadata=metadata,
            views=view_class
        )
        for value, name in filter(_bool_first, map(get_setting_for_view, view_settings)):
            view_attributes[name] = SimpleLazyObject(lambda obj=value: list(map(get_if_lazy, obj)))

        view_attributes['search_fields'] = SimpleLazyObject(lambda: tuple(cls._get_search_fields(
            serializers['serializer_class_one'],
            metadata['search_fields']
        )))

        generated_view = type(
            f'{cls.__name__}ViewSet',
            tuple(view_class),
            {
                **view_attributes,
                **serializers,
                **get_append_to_view(vars(cls).items()),
                **get_parents_append_to_view([vars(c).items() for c in cls.mro()]),
            }
        )

        generated_view = apply_decorators(
            *map(_import_class_if_string, getattr(cls, 'generated_view_decorators', []))
        )(ApplyNestedDecorators(metadata['nested'] or {})(generated_view))

        if hasattr(cls, 'deep_parent_field') and issubclass(generated_view, CHANGE_MIXINS):
            remote_name: str = cls.get_model_fields_mapping(
                fields_getter=cls._meta.get_fields
            )[cls.deep_parent_field].remote_field.related_name

            parent_view = type(
                f'Parent{cls.__name__}ViewSet',
                (generated_view,),
                {'deep_nested_subview': remote_name}
            )
            return ApplyNestedDecorators({remote_name: {
                'view': generated_view,
                'arg': cls._meta.pk.attname,
                'manager_name': remote_name,
                'allow_append': getattr(cls, 'deep_parent_allow_append', False),
            }})(parent_view)

        return generated_view
