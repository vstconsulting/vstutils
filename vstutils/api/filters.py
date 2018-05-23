from django.contrib.auth.models import User
from django_filters import rest_framework as filters
from django_filters import CharFilter


def _extra_search(queryset, field, value, stype):
    vals = field.split("__")
    field, tp = vals[0], (list(vals)[1:2] + [""])[0]
    field += "__{}".format(stype)
    value = value.split(",") if stype == "in" else value
    if tp.upper() == "NOT":
        return queryset.exclude(**{field: value})
    return queryset.filter(**{field: value})


def extra_filter(queryset, field, value):
    return _extra_search(queryset, field, value, "in")


def name_filter(queryset, field, value):
    return _extra_search(queryset, field, value, "contains")


class UserFilter(filters.FilterSet):
    id        = CharFilter(method=extra_filter)
    id__not   = CharFilter(method=extra_filter)
    username__not = CharFilter(method=name_filter)
    username      = CharFilter(method=name_filter)

    class Meta:
        model = User
        fields = ('id',
                  'username',
                  'is_active',
                  'first_name',
                  'last_name',
                  'email',)
