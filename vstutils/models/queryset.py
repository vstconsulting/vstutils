# pylint: disable=no-member,no-classmethod-decorator,protected-access
from django.db import models
from django.utils.functional import cached_property

from ..utils import Paginator, deprecated, raise_context_decorator_with_default


class BQuerySet(models.QuerySet):
    """
    Represent a lazy database lookup for a set of objects.
    Allows to override default iterable class by `custom_iterable_class` attr.
    """

    use_for_related_fields = True

    @property
    def _iterable_class(self):
        if hasattr(self, '__iterable_class__'):
            return self.__iterable_class__
        if hasattr(self, 'custom_iterable_class'):
            self.__iterable_class__ = self.custom_iterable_class
        return self._iterable_class

    @_iterable_class.setter
    def _iterable_class(self, value):
        if not hasattr(self, 'custom_iterable_class'):
            self.__iterable_class__ = value

    @_iterable_class.deleter
    def _iterable_class(self):  # nocv
        del self.__iterable_class__

    def paged(self, *args, **kwargs):
        """
        Returns paginated data with custom Paginator-class.
        By default, uses `PAGE_LIMIT` from global settings.
        """
        return self.get_paginator(*args, **kwargs).items()

    def get_paginator(self, *args, **kwargs):
        return Paginator(self.filter(), *args, **kwargs)

    def has_field_filter_in_query(self, field_name):
        return any(filter(
            raise_context_decorator_with_default(default=False)(
                lambda x: x.lhs.field.attname == field_name
            ),
            self.query.where.children
        ))

    @cached_property
    def has_hidden_filter(self):
        return self.has_field_filter_in_query('hidden')

    def cleared(self):
        """
        Filter queryset for models with attribute 'hidden' and
        exclude all hidden objects.
        """
        if hasattr(self.model, "hidden") and not self.has_hidden_filter:
            return self.filter(hidden=False)
        return self

    @deprecated
    def _find(self, field_name, tp_name, *args, **kwargs):  # nocv
        field = kwargs.get(field_name, None) or (list(args)[0:1]+[None])[0]
        if field is None:
            return self
        if isinstance(field, list):
            return getattr(self, tp_name)(**{field_name+"__in": field})
        return getattr(self, tp_name)(**{field_name: field})
