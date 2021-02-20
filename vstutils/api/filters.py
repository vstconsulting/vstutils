import typing as _t
import operator
from functools import reduce

from django.conf import settings
from django.db.models import Q
from django.utils.functional import SimpleLazyObject
from django_filters import rest_framework as filters
from django_filters import CharFilter

from .. import utils

id_help = 'A unique integer value (or comma separated list) identifying this instance.'
name_help = 'A name string value (or comma separated list) of instance.'
name_filter_method = "contains" if settings.CASE_SENSITIVE_API_FILTER else 'icontains'


def _extra_query_search(field, value, stype):
    vals = field.rsplit("__", 1)
    field_name, tp = vals[0], (list(vals)[1:2] + [""])[0]
    negate = tp.upper() == "NOT"
    if negate:
        field = field_name
    field += f"__{stype}"
    value = value.split(",") if stype == "in" else value
    return {field: value}, negate


def _extra_search(queryset, field, value, stype):
    query_filter, negate = _extra_query_search(field, value, stype)
    if negate:
        return queryset.exclude(**query_filter)
    return queryset.filter(**query_filter)


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
    return _extra_search(queryset, field, value, name_filter_method)


class FkFilterHandler:
    """
    Simple handler for filtering by relational fields.

    :param related_pk: Field name of related model's primary key. Default is 'id'.
    :param related_name: Field name of related model's charfield. Default is 'name'.
    :param pk_handler: Changes handler for checking value before search. Sends "0" in handler falls. Default is 'int()'.

    Example:
        .. sourcecode:: python

            class CustomFilterSet(filters.FilterSet):
                author = CharFilter(method=vst_filters.FkFilterHandler(related_pk='pk', related_name='email'))

        Where ``author`` is ForeignKey to `User` and you want to search by primary key and email.
    """
    __slots__ = ('related_pk', 'related_name', 'pk_handler')

    def __init__(self, related_pk: str = 'id', related_name: str = 'name', pk_handler: _t.Callable = int):
        self.related_pk = related_pk
        self.related_name = related_name
        self.pk_handler = pk_handler

    def __get_q(self, kw, negate):
        query = Q(**kw)
        if negate:
            query.negate()  # nocv
        return query

    def list_of_q(self, field, value):
        if self.related_pk:
            pk_value = SimpleLazyObject(
                utils.raise_context_decorator_with_default(default='0')(
                    lambda: str(self.pk_handler(value)) or "0"
                )
            )
            yield self.__get_q(*_extra_query_search(f'{field}__{self.related_pk}', pk_value, "in"))
        if self.related_name:
            yield self.__get_q(*_extra_query_search(f'{field}__{self.related_name}', value, name_filter_method))

    def __call__(self, queryset, field, value):
        return queryset.filter(
            reduce(
                operator.or_,
                self.list_of_q(field, value)
            )
        )


class DefaultIDFilter(filters.FilterSet):
    """
    Basic filterset to search by id. Provides a search for multiple values separated by commas.
    Uses :func:`.extra_filter` in fields.
    """
    id = CharFilter(method=extra_filter, help_text=id_help, label="Primary keys")
    id__not = CharFilter(method=extra_filter, help_text=id_help, label="Exclude primary keys")


class DefaultNameFilter(filters.FilterSet):
    """
    Basic filterset to search by part of name. Uses `LIKE` DB condition by :func:`.name_filter`.
    """
    name = CharFilter(method=name_filter, help_text=name_help, label="Name")
    name__not = CharFilter(method=name_filter, help_text=name_help, label='Exclude name')
