# pylint: disable=no-member,no-classmethod-decorator,protected-access
from django.db import models
from django.utils.functional import cached_property

from ..utils import Paginator, raise_context_decorator_with_default, is_member_descriptor


class BQuerySet(models.QuerySet):
    """
    Represent a lazy database lookup for a set of objects.
    Allows to override default iterable class by `custom_iterable_class` attribute
    (class with `__iter__` method which returns generator of model objects) and
    default query class by `custom_query_class` attribute
    (class inherited from :class:`django.db.models.sql.query.Query`).
    """

    __slots__ = ('__iterable_class__',)
    use_for_related_fields = True
    custom_query_class = None

    def __init__(self, model=None, query=None, using=None, hints=None):
        if query is None and self.custom_query_class is not None:
            query = self.custom_query_class(self)  # pylint: disable=not-callable
        super().__init__(model=model, query=query, using=using, hints=hints)

    @property
    def _iterable_class(self):
        if hasattr(self, '__iterable_class__') and not is_member_descriptor(self.__iterable_class__):
            return self.__iterable_class__
        if hasattr(self, 'custom_iterable_class'):  # pragma: no branch
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
        Uses `PAGE_LIMIT` from global settings by default.
        """
        return self.get_paginator(*args, **kwargs).items()

    def get_paginator(self, *args, **kwargs):
        """
        Returns initialized object of :class:`vstutils.utils.Paginator` over
        current instance's QuerySet. All args and kwargs go to to Paginator's constructor.
        """
        return Paginator(self.filter(), *args, **kwargs)

    def has_field_filter_in_query(self, field_name):
        return any(filter(
            raise_context_decorator_with_default(default=False)(
                lambda x: getattr(x.lhs.field, 'attname', None) == field_name
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
