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
    """
    Method for searching values in a comma-separated list.

    :param queryset: model queryset for filtration.
    :type queryset: django.db.models.query.QuerySet
    :param field: field name in FilterSet. Also supports `__not` suffix.
    :type field: str
    :param value: comma separated list of searching values.
    :type value: str
    :return: filtered queryset.
    :rtype: django.db.models.query.QuerySet
    """

    return _extra_search(queryset, field, value, "in")


def name_filter(queryset, field, value):
    """
    Method for searching by part of name. Uses `LIKE` DB condition or `contains` qs-expression.

    :param queryset: model queryset for filtration.
    :type queryset: django.db.models.query.QuerySet
    :param field: field name in FilterSet. Also supports `__not` suffix.
    :type field: str
    :param value: searching part of name.
    :type value: str
    :return: filtered queryset.
    :rtype: django.db.models.query.QuerySet
    """

    return _extra_search(queryset, field, value, "contains")


class DefaultIDFilter(filters.FilterSet):
    """
    Basic filterset to search by id. Provides a search for multiple values separated by commas.
    Uses :func:`.extra_filter` in fields.
    """
    id = CharFilter(method=extra_filter, help_text=id_help)
    id__not = CharFilter(method=extra_filter, help_text=id_help)


class DefaultNameFilter(filters.FilterSet):
    """
    Basic filterset to search by part of name. Uses `LIKE` DB condition by :func:`.name_filter`.
    """
    name = CharFilter(method=name_filter, help_text=name_help)
    name__not = CharFilter(method=name_filter, help_text=name_help)
