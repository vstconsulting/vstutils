import typing as _t

from rest_framework.filters import BaseFilterBackend
from django_filters.rest_framework.backends import DjangoFilterBackend as BaseDjangoFilterBackend
from django_filters.rest_framework import filters
from django_filters import compat
from django.db import models
from vstutils.utils import raise_context

from .filters import extra_filter


class DjangoFilterBackend(BaseDjangoFilterBackend):
    def get_coreschema_field(self, field):
        if isinstance(field, filters.NumberFilter):
            field_cls = compat.coreschema.Number
        elif isinstance(field, filters.BooleanFilter):
            field_cls = compat.coreschema.Boolean
        else:
            field_cls = compat.coreschema.String
        if field.method == extra_filter:  # pylint: disable=comparison-with-callable
            result = compat.coreschema.Array(
                items=field_cls(),
                min_items=1,
                unique_items=True,
                description=str(field.extra.get('help_text', ''))
            )
        else:
            result = field_cls(
                description=str(field.extra.get('help_text', ''))
            )
        return result


# Call standart filtering
class VSTFilterBackend(BaseFilterBackend):
    """
    A base filter backend class to be inherited from.
    Example:

        .. sourcecode:: python

            from django.utils import timezone
            from django.db.models import Value, DateTimeField

            from vstutils.api.filter_backends import VSTFilterBackend

            CurrentTimeFilterBackend(VSTFilterBackend):
                def filter_queryset(self, request, queryset, view):
                    return queryset.annotate(current_time=Value(timezone.now(), output_field=DateTimeField())

        In this example Filter Backend annotates time in current timezone to any connected
        model's queryset.
    """
    __slots__ = ()
    required = False

    def filter_queryset(self, request, queryset, view):
        raise NotImplementedError  # nocv

    def get_schema_fields(self, view):
        """
        You can also make the filter controls available to the schema autogeneration that REST framework provides,
        by implementing this method. The method should return a list of coreapi.Field instances.
        """
        # pylint: disable=unused-argument
        return []


class HideHiddenFilterBackend(VSTFilterBackend):
    """Filter Backend that hides all objects with hidden=True from the queryset"""
    __slots__ = ()
    required = True

    def filter_queryset(self, request, queryset, view):
        # pylint: disable=unused-argument
        """
        Clear objects with hidden attr from queryset.
        """
        return getattr(queryset, 'cleared', queryset.all)()


class SelectRelatedFilterBackend(VSTFilterBackend):
    """
    Filter Backend that will automatically call prefetch_related and select_related on all relations in queryset.
    """
    __slots__ = ()
    required = True
    fields_fetch_map = {
        'select': (models.ForeignKey, models.OneToOneField),
        'prefetch': (models.ManyToManyField, models.ManyToManyField.rel_class)
    }

    def filter_model_fields(self, view, field_types):
        return tuple(
            map(
                lambda f: f.name,
                filter(
                    lambda f: isinstance(f, field_types),
                    view.get_serializer_class().Meta.model()._meta.fields
                )
            )
        )

    def filter_by_func(self, queryset, queryset_func_name, related):
        if related:
            return getattr(queryset, queryset_func_name)(*related)
        return queryset

    def prefetch(self, queryset_func_name, view, queryset):
        with raise_context():
            queryset = self.filter_by_func(
                queryset,
                f'{queryset_func_name}_related',
                self.filter_model_fields(view, self.fields_fetch_map[queryset_func_name])
            )
        return queryset

    def filter_queryset(self, request, queryset, view):
        """
        Select related in queryset.
        """
        if queryset.query.select_related:
            return queryset
        if not getattr(view, 'select_related', True):
            return queryset
        if request.method != 'GET':
            return queryset
        return self.prefetch('prefetch', view, self.prefetch('select', view, queryset))


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
        compat.coreschema.Integer: filters.NumberFilter,  # type: ignore
        compat.coreschema.String: filters.CharFilter,  # type: ignore
    }

    def filter_queryset(self, request, queryset, view):
        if view.action != 'list':
            return queryset
        model = queryset.model
        parent_name: _t.Optional[_t.Text] = getattr(model, 'deep_parent_field', None)
        if not parent_name or self.field_name not in request.query_params:
            return queryset
        filter_type_class = self.field_types[type(self.get_coreschema_field(model))]
        filter_data = request.query_params.get(self.field_name)
        if not filter_data:
            return queryset.filter(**{f'{parent_name}__isnull': True})
        pk_name = model._meta.pk.attname
        parent_qs = model.objects.filter(**{pk_name: filter_data})
        parent_qs = getattr(parent_qs, 'cleared', parent_qs.all)()
        return filter_type_class(field_name=parent_name, lookup_expr='in').filter(
            queryset,
            value=parent_qs.values(pk_name)
        )

    def get_coreschema_field(self, model: models.Model):
        primary_key_field: _t.Optional[models.Field] = model._meta.pk
        if isinstance(primary_key_field, models.IntegerField):
            field_cls = compat.coreschema.Integer  # type: ignore
        else:  # nocv
            field_cls = compat.coreschema.String  # type: ignore
        return field_cls(
            description=''
        )

    def get_schema_fields(self, view):
        return [
            compat.coreapi.Field(
                name=self.field_name,
                required=False,
                location='query',
                schema=self.get_coreschema_field(view.get_queryset().model),
            )
        ]
