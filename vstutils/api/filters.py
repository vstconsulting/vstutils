from django_filters import rest_framework as filters
from django_filters import CharFilter

id_help = 'A unique integer value (or comma separated list) identifying this instance.'
name_help = 'A name string value (or comma separated list) of instance.'


def _extra_search(queryset, field, value, stype):
    vals = field.split("__")
    field, tp = vals[0], (list(vals)[1:2] + [""])[0]
    field += f"__{stype}"
    value = value.split(",") if stype == "in" else value
    if tp.upper() == "NOT":
        return queryset.exclude(**{field: value})
    return queryset.filter(**{field: value})


def extra_filter(queryset, field, value):
    return _extra_search(queryset, field, value, "in")


def name_filter(queryset, field, value):
    return _extra_search(queryset, field, value, "contains")


class DefaultIDFilter(filters.FilterSet):
    id = CharFilter(method=extra_filter, help_text=id_help)
    id__not = CharFilter(method=extra_filter, help_text=id_help)
