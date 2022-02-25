# pylint: disable=no-member,no-classmethod-decorator,protected-access
from django.db import models
from django.utils.functional import cached_property
from django.conf import settings

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

    def _get_deep_nested_qs_with_cte(self, with_current=False, deep_children=True):
        model_to_sql = self.model
        origin_model_pk = field_to_get = self.model._meta.pk.name
        deep_field_name = self.model.deep_parent_field

        field = getattr(self.model, deep_field_name)
        m2m_model = getattr(field, 'through', None)
        if m2m_model:
            field_to_get, deep_field_name = getattr(
                self.model._meta.get_field(deep_field_name),
                'through_fields',
                [f'from_{self.model.__name__.lower()}_id', f'to_{self.model.__name__.lower()}_id']
            )
            model_to_sql = m2m_model

        sql_table = model_to_sql._meta.db_table
        sql_column_to_get = getattr(model_to_sql, field_to_get).field.column
        sql_deep_column = getattr(model_to_sql, deep_field_name).field.column

        if not deep_children:
            # then deep_parents
            sql_column_to_get, sql_deep_column = sql_deep_column, sql_column_to_get

        with_current_sql = f'''
            UNION
            {str(self.values(origin_model_pk).order_by().query)}
        '''

        sql = f'''
            WITH RECURSIVE nested as (
                    SELECT {sql_table}.{sql_column_to_get}, {sql_table}.{sql_deep_column}
                    FROM {sql_table}
                    WHERE {sql_table}.{sql_deep_column}
                        IN ({str(self.values(origin_model_pk).order_by().query)})
                UNION
                    SELECT {sql_table}.{sql_column_to_get}, {sql_table}.{sql_deep_column}
                    FROM {sql_table}
                        JOIN nested
                            ON {sql_table}.{sql_deep_column} = nested.{sql_column_to_get}
            )
            SELECT {sql_column_to_get} from nested
        '''
        if with_current:
            sql += with_current_sql
        return self.model.objects.extra(where=[f'id IN ({sql})'])  # nosec

    def _deep_nested_ids_without_cte(self, accumulated=None, deep_children=True):
        deep_parent_field = self.model.deep_parent_field
        related_name = self.model._meta.get_field(deep_parent_field).related_query_name()
        if deep_children:
            related_name = deep_parent_field

        # accumulate retrieved id's
        accumulated = accumulated if accumulated else self.none()
        # get all id's from model except already accumulated
        list_id = self.exclude(id__in=accumulated).values_list("id", flat=True)
        accumulated = (accumulated | list_id)
        kw = {related_name + "__id__in": list_id}
        subs = self.model.objects.using(self.db).filter(**kw)
        subs_id = subs.values_list("id", flat=True)
        if subs_id:
            accumulated = (accumulated | subs._deep_nested_ids_without_cte(accumulated, deep_children))
        return accumulated

    def _get_deep_qs(self, with_current=False, deep_children=True):
        if self.db in settings.DATABASES_WITHOUT_CTE_SUPPORT:
            qs = self.model.objects.filter(id__in=self._deep_nested_ids_without_cte(deep_children=deep_children))
            if not with_current:
                qs = qs.exclude(id__in=self.values('id'))
            return qs
        return self._get_deep_nested_qs_with_cte(with_current=with_current, deep_children=deep_children)

    def get_parents(self, with_current=False):
        return self._get_deep_qs(with_current=with_current, deep_children=False)

    def get_children(self, with_current=False):
        return self._get_deep_qs(with_current=with_current, deep_children=True)
