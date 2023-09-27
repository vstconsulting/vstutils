import typing as _t
import warnings
import contextlib

from django.db import models
from django.utils.encoding import force_str
from django_filters import filters, filterset
from django_filters.rest_framework.backends import DjangoFilterBackend as BaseDjangoFilterBackend
from drf_yasg import openapi
from rest_framework.filters import BaseFilterBackend, OrderingFilter
from rest_framework.serializers import Serializer

from .filters import extra_filter
from .fields import FkField, RelatedListField
from ..utils import translate as _


def get_serializer_readable_fields(serializer):
    # pylint: disable=protected-access
    return {
        f.source if f.source and '.' not in f.source else f.field_name
        for f in serializer._readable_fields
    }


def get_field_type_from_queryset(field):
    field_type, kwargs = openapi.TYPE_STRING, {}
    if isinstance(field, (models.AutoField, models.IntegerField)):
        field_type = openapi.TYPE_INTEGER
    elif isinstance(field, models.UUIDField):
        kwargs['format'] = openapi.FORMAT_UUID
    return field_type, kwargs


class DjangoFilterBackend(BaseDjangoFilterBackend):
    def get_openapi_field_schema(self, field_name, field, queryset):
        # pylint: disable=unused-variable,comparison-with-callable
        field_type: str = openapi.TYPE_STRING
        kwargs: dict = {}

        if isinstance(field, filters.NumberFilter):
            field_type = openapi.TYPE_NUMBER
        elif isinstance(field, filters.BooleanFilter):
            field_type = openapi.TYPE_BOOLEAN
        elif isinstance(field, filters.ChoiceFilter):
            kwargs['enum'] = tuple(dict(field.field.choices).keys())
        elif field_name in {'id', 'id__not'}:
            search_field = field_name.split('__')[0]
            m_field = next((f for f in queryset.model._meta.fields if f.name == search_field), None)
            field_type, kwargs_update = get_field_type_from_queryset(m_field)

        if field.method == extra_filter:
            kwargs = {
                'items': {
                    'type': field_type,
                    **kwargs,
                },
                'minItems': 1,
                'uniqueItems': True,
                'collectionFormat': 'csv',
            }
            field_type = openapi.TYPE_ARRAY

        return {
            **kwargs,
            'type': field_type
        }

    def get_schema_operation_parameters(self, view):
        try:
            queryset = view.queryset
        except Exception:  # nocv
            queryset = None
            warnings.warn(
                f"{view.__class__} is not compatible with schema generation",
                stacklevel=2,
            )

        filterset_class = self.get_filterset_class(view, queryset)

        if not filterset_class:
            return []

        parameters = []
        for field_name, field in filterset_class.base_filters.items():
            parameter = {
                "name": field_name,
                "required": field.extra["required"],
                "in": openapi.IN_QUERY,
                "description": str(field.extra.get('help_text', '')),
                "schema": self.get_openapi_field_schema(field_name, field, queryset),
            }
            parameters.append(parameter)
        return parameters


class OrderingFilterBackend(OrderingFilter):
    def _get_fields_for_schema(self, view):
        for field in self.get_valid_fields(view.get_queryset(), view, {'request': view.request}):
            yield field[0]
            yield f'-{field[0]}'

    def get_schema_operation_parameters(self, view):
        return [
            {
                'name': self.ordering_param,
                'required': False,
                'in': openapi.IN_QUERY,
                'description': force_str(self.ordering_description),
                'minItems': 1,
                'uniqueItems': True,
                'collectionFormat': 'csv',
                'schema': {
                    'type': openapi.TYPE_ARRAY,
                    'x-title': _(force_str(self.ordering_title)),
                    'items': {
                        'type': openapi.TYPE_STRING,
                        'format': 'ordering_choices',
                        'enum': tuple(self._get_fields_for_schema(view)),
                    },
                },
            },
        ]


# Call standard filtering
class VSTFilterBackend(BaseFilterBackend):
    """
    A base filter backend class to be inherited from.
    Example:

        .. sourcecode:: python

            from django.utils import timezone
            from django.db.models import Value, DateTimeField

            from vstutils.api.filter_backends import VSTFilterBackend

            class CurrentTimeFilterBackend(VSTFilterBackend):
                def filter_queryset(self, request, queryset, view):
                    return queryset.annotate(current_time=Value(timezone.now(), output_field=DateTimeField()))

        In this example Filter Backend annotates time in current timezone to any connected
        model's queryset.

    In some cases it may be necessary to provide a parameter from a query of request.
    To define this parameter in the schema, you must overload the get_schema_operation_parameters
    function and specify a list of parameters to use.

    Example:

        .. sourcecode:: python

            from django.utils import timezone
            from django.db.models import Value, DateTimeField

            from vstutils.api.filter_backends import VSTFilterBackend

            class ConstantCurrentTimeForQueryFilterBackend(VSTFilterBackend):
                query_param = 'constant'

                def filter_queryset(self, request, queryset, view):
                    if self.query_param in request.query_params and request.query_params[self.query_param]:
                        queryset = queryset.annotate(**{
                            request.query_params[self.query_param]: Value(timezone.now(), output_field=DateTimeField())
                        })
                    return queryset

                    def get_schema_operation_parameters(self, view):
                        return [
                            {
                                "name": self.query_param,
                                "required": False,
                                "in": openapi.IN_QUERY,
                                "description": "Annotate value to queryset",
                                "schema": {
                                    "type": openapi.TYPE_STRING,
                                }
                            },
                        ]

        In this example Filter Backend annotates time in current timezone to any connected
        model's queryset with field name from query `constant`.
    """
    required: bool = False
    serializer_class: _t.Optional[_t.Type[Serializer]] = None

    def get_serialized_query_params(self, request, view):
        # pylint: disable=not-callable
        serializer = self.serializer_class(
            data=request.query_params,
            context={'request': request, 'filter_backend': self, 'view': view},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    def filter_queryset(self, request, queryset, view):
        raise NotImplementedError  # nocv

    def get_schema_operation_parameters(self, view):
        """
        You can also make the filter controls available to the schema autogeneration that REST framework provides,
        by implementing this method. The method should return a list of OpenAPI schema mappings.
        """
        # pylint: disable=unused-argument
        return []


class HideHiddenFilterBackend(VSTFilterBackend):
    """Filter Backend that hides all objects with hidden=True from the queryset"""
    required = True

    def filter_queryset(self, request, queryset, view):
        # pylint: disable=unused-argument
        """
        Clear objects with hidden attr from queryset.
        """
        return getattr(queryset, 'cleared', queryset.all)()


def _get_fields_mapping(serializer, readable_fields, field_types):
    for m_field in filter(lambda f: isinstance(f, field_types), serializer.Meta.model()._meta.get_fields()):
        for r_field in readable_fields:
            if (r_field.source and r_field.source == m_field.name) or (r_field.field_name == m_field.name):
                yield m_field, r_field
            elif isinstance(r_field, RelatedListField) and r_field.related_name == m_field.name:
                yield m_field, r_field


class SelectRelatedFilterBackend(VSTFilterBackend):
    """
    Filter Backend that will automatically call prefetch_related and select_related on all relations in queryset.
    """
    required = True
    fields_fetch_map = {
        'select': (models.ForeignKey,),
        'prefetch': (models.ManyToManyField, models.ManyToManyField.rel_class)
    }

    def filter_model_fields(self, view, field_types, filter_type):
        # pylint: disable=protected-access
        fields = _get_fields_mapping(
            serializer := view.get_serializer_class()(),
            tuple(serializer._readable_fields),
            field_types,
        )

        if filter_type == 'select':
            return {f[0] for f in fields}

        prefetches = []
        for m_field, s_field in fields:
            if s_field.__class__ in {FkField}:
                continue  # nocv
            if isinstance(s_field, RelatedListField):
                related_model_fields = tuple(f.name for f in m_field.related_model._meta.get_fields())
                prefetches.append(
                    models.Prefetch(
                        m_field.name,
                        queryset=m_field.related_model._default_manager.only(
                            *[
                                f.source if f.source and f.source in related_model_fields else f.field_name
                                for f in s_field.serializer_class()._readable_fields
                            ]
                        ),
                    )
                )
            else:
                prefetches.append(m_field.name)  # nocv
        return prefetches

    def filter_by_func(self, queryset, queryset_func_name, related):
        if related:
            return getattr(queryset, queryset_func_name)(*related)
        return queryset

    def prefetch(self, queryset_func_name, view, queryset):
        with contextlib.suppress(BaseException):
            queryset = self.filter_by_func(
                queryset,
                f'{queryset_func_name}_related',
                self.filter_model_fields(
                    view,
                    self.fields_fetch_map[queryset_func_name],
                    filter_type=queryset_func_name,
                )
            )
        return queryset

    def filter_queryset(self, request, queryset, view):
        """
        Select+prefetch related in queryset.
        """
        if request.method != 'GET':
            return queryset

        if not queryset.query.select_related and getattr(view, 'select_related', True):
            queryset = self.prefetch('select', view, queryset)

        # pylint: disable=protected-access
        if not queryset._prefetch_related_lookups and getattr(view, 'prefetch_related', True):
            queryset = self.prefetch('prefetch', view, queryset)
        return queryset


class DeepViewFilterBackend(VSTFilterBackend):
    """
    Backend that filters queryset by column from `deep_parent_field` property of the model.
    Value for filtering must be provided in query param `__deep_parent`.

    If param is missing then no filtering is applied.

    If param is empty value (`/?__deep_parent=`) then objects with no parent (the value of the field whose name is
    stored in the property `deep_parent_field` of the model is None) returned.

    This filter backend and nested view is automatically added when model has `deep_parent_field` property.

    Example:
        .. sourcecode:: python

            from django.db import models
            from vstutils.models import BModel

            class DeepNestedModel(BModel):
                name = models.CharField(max_length=10)
                parent = models.ForeignKey('self', null=True, default=None, on_delete=models.CASCADE)

                deep_parent_field = 'parent'
                deep_parent_allow_append = True

                class Meta:
                    default_related_name = 'deepnested'

    In example above if we add this model under path '`deep`', following views will be created: `/deep/` and
    `/deep/{id}/deepnested/`.

    Filter backend can be used as `/deep/?__deep_parent=1` and will return all `DeepNestedModel` objects
    whose parent's primary key is `1`.

    You can also use generic DRF views, for that you still must set `deep_parent_field`
    to your model and manually add `DeepViewFilterBackend` to
    `filter_backends <https://www.django-rest-framework.org/api-guide/filtering/#djangofilterbackend>`_ list.
    """
    field_name = '__deep_parent'
    field_types = {
        openapi.TYPE_INTEGER: filters.NumberFilter,
        openapi.TYPE_NUMBER: filters.NumberFilter,
        openapi.TYPE_STRING: filters.CharFilter,
    }

    def filter_queryset(self, request, queryset, view):
        model = queryset.model
        parent_name: _t.Optional[_t.Text] = getattr(model, 'deep_parent_field', None)
        nested = getattr(view, 'nested_id', False) or getattr(getattr(view, 'nested_parent_object', None), 'id', None)
        if view.action != 'list':
            if parent_name and nested:
                return queryset.get_children(with_current=True)
            return queryset
        if not parent_name or self.field_name not in request.query_params:
            return queryset
        filter_data, filter_type_class = self.get_filter_class_with_data(model, request.query_params)
        if not filter_data:
            return queryset.filter(**{f'{parent_name}__isnull': True})
        pk_name = model._meta.pk.attname
        parent_qs = model.objects.filter(**{pk_name: filter_data})
        parent_qs = getattr(parent_qs, 'cleared', parent_qs.all)()
        if nested:
            queryset = model.objects.all()
        return filter_type_class(field_name=parent_name, lookup_expr='in').filter(
            queryset,
            value=parent_qs.values(pk_name)
        )

    def get_filter_class_with_data(self, model: _t.Type[models.Model], data: _t.Mapping):
        # pylint: disable=protected-access
        filterset_type = self.field_types[get_field_type_from_queryset(model._meta.pk)[0]]
        filterset_class = type('FilterSet', (filterset.FilterSet,), {self.field_name: filterset_type()})
        filterset_object = filterset_class(data, model._default_manager.all())
        filterset_object.is_valid()
        return filterset_object.form.cleaned_data[self.field_name], filterset_type

    def get_schema_operation_parameters(self, view):
        field_type, kwargs = get_field_type_from_queryset(view.get_queryset().model._meta.pk)
        return [
            {
                "name": self.field_name,
                "required": False,
                "in": openapi.IN_QUERY,
                "schema": {
                    "type": field_type,
                    **kwargs,
                }
            }
        ]
