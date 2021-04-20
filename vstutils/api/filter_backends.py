from rest_framework.filters import BaseFilterBackend
from django_filters.rest_framework.backends import DjangoFilterBackend as BaseDjangoFilterBackend
from django_filters.rest_framework import filters
from django_filters import compat
from django.db import models
from vstutils.utils import raise_context


class DjangoFilterBackend(BaseDjangoFilterBackend):
    def get_coreschema_field(self, field):
        if isinstance(field, filters.NumberFilter):
            field_cls = compat.coreschema.Number
        elif isinstance(field, filters.BooleanFilter):
            field_cls = compat.coreschema.Boolean
        else:
            field_cls = compat.coreschema.String
        return field_cls(
            description=str(field.extra.get('help_text', ''))
        )


# Call standart filtering
class VSTFilterBackend(BaseFilterBackend):
    """
    A base class from which all filter backend classes should inherit from.
    Example:

        .. sourcecode:: python

            from django.utils import timezone
            from django.db.models import Value, DateTimeField

            from vstutils.api.filter_backends import VSTFilterBackend

            CurrentTimeFilterBackend(VSTFilterBackend):
                def filter_queryset(self, request, queryset, view):
                    return queryset.annotate(current_time=Value(timezone.now(), output_field=DateTimeField())

        In this example we created Filter Backend that will annotate current time in current timezone to any connected
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
    """Filter Backend that will hide all objects with hidden=True from the queryset"""
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
    Filter Backend that will automatically call prefetch_related and select_realted on all relations in queryset.
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
