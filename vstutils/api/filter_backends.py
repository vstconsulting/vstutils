from django.db import models
from vstutils.utils import raise_context


# Call standart filtering
class VSTFilterBackend:
    __slots__ = ()
    required = False

    def filter_queryset(self, request, queryset, view):
        raise NotImplementedError  # nocv

    def get_schema_fields(self, view):
        # pylint: disable=unused-argument
        return []


class HideHiddenFilterBackend(VSTFilterBackend):
    __slots__ = ()
    required = True

    def filter_queryset(self, request, queryset, view):
        # pylint: disable=unused-argument
        """
        Clear objects with hidden attr from queryset.
        """
        return getattr(queryset, 'cleared', queryset.all)()


class SelectRelatedFilterBackend(VSTFilterBackend):
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
