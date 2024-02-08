# cython: binding=True
# pylint: disable=unused-import
from copy import deepcopy
from functools import partial

from yaml import load
try:
    from yaml import CSafeLoader as Loader
except ImportError:  # nocv
    from yaml import SafeLoader as Loader
from django.db.models.query import ModelIterable
from django.db.models.fields import CharField, TextField, IntegerField, BooleanField, AutoField    # noqa: F401

from . import BQuerySet, BaseModel
from .base import ModelBaseClass
from ..utils import raise_context
from ..tools import get_file_value, multikeysort  # pylint: disable=import-error


class Query(dict):
    distinct_fields = False

    def __init__(self, queryset, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.queryset = queryset
        self.combinator = None
        self.is_sliced = False
        self.select_for_update = False
        self.select_related = False
        self['standard_ordering'] = True

    @property
    def model(self):
        return self.queryset.model

    @property
    def standard_ordering(self):
        return self['standard_ordering']

    @standard_ordering.setter
    def standard_ordering(self, value):
        self['standard_ordering'] = bool(value)

    def chain(self):
        return self.clone()

    def clone(self):
        query = deepcopy(self)
        if 'custom_queryset_kwargs' in self:
            query['custom_queryset_kwargs'] = self['custom_queryset_kwargs']
        return query

    def _check_data(self, check_type, data):
        # pylint: disable=protected-access,too-many-return-statements
        if getattr(self, 'empty', False):
            return False
        check_data = self.get(check_type, {})
        if check_type == 'exclude' and not check_data:
            return False
        meta = self.model._meta
        for filter_name, filter_data in check_data.items():
            filter_name = filter_name.replace('__exact', '')
            filter_name__cleared, search_format = (filter_name.split('__', maxsplit=1) + [None])[:2]
            if filter_name__cleared == 'pk':
                filter_name__cleared = meta.pk.attname
            try:
                value = data[filter_name__cleared]
            except KeyError:
                continue
            field = meta._forward_fields_map[filter_name__cleared]
            if isinstance(filter_data, (list, tuple, set)):
                filter_data = map(field.to_python, filter_data)
            else:
                filter_data = field.to_python(filter_data)
            if search_format == 'in':
                if value not in filter_data:
                    return False
            elif search_format == 'contains' and isinstance(filter_data, str):
                if filter_data not in value:
                    return False
            elif search_format == 'icontains' and isinstance(filter_data, str):
                if filter_data.upper() not in value.upper():
                    return False
            elif search_format is None:
                if filter_data != value:
                    return False
        return True

    def check_in_query(self, data):
        return self._check_data('filter', data) and not self._check_data('exclude', data)

    def set_empty(self):
        self.empty = True

    def set_limits(self, low: int = None, high: int = None):
        self['low_mark'], self['high_mark'] = low, high
        self.is_sliced = True

    def has_results(self, *args, **kwargs):
        # pylint: disable=unused-argument
        return bool(self.queryset.all()[:2])

    def get_count(self, using):
        # pylint: disable=unused-argument
        model = self.model
        if hasattr(model, 'get_data_generator_count'):
            return model.get_data_generator_count(self)
        return len(self.queryset.all())

    def can_filter(self):
        return self.get('low_mark', None) is None and self.get('high_mark', None) is None

    def clear_ordering(self, *args, **kwargs):
        # pylint: disable=unused-argument
        self['ordering'] = []

    def add_ordering(self, *ordering):
        self['ordering'] = ordering

    @property
    def order_by(self):
        return self.get('ordering', ())


class CustomModelIterable(ModelIterable):
    def values_handler(self, unit, fields, pk_name):
        # pylint: disable=no-member
        return {f: unit.get(f) if f != 'pk' else unit.get(pk_name) for f in fields}

    def construct_instance(self, data, model, only_fields, defer_fields):
        if only_fields is not None:
            data = {k: v for k, v in data.items() if k in only_fields}
        elif defer_fields is not None:
            data = {k: v for k, v in data.items() if k not in defer_fields}
        for field in model._meta.get_fields():
            if field.attname in data:
                with raise_context():
                    data[field.attname] = field.to_python(data[field.attname])
        return model(**data)

    def __iter__(self):
        # pylint: disable=protected-access
        queryset = self.queryset
        model = queryset.model
        query = queryset.query

        if hasattr(model, 'get_data_generator'):
            model_data = model.get_data_generator(query=query)
        else:
            model_data = model._get_data(
                chunked_fetch=self.chunked_fetch,
                **query.get('custom_queryset_kwargs', {})
            )
            if isinstance(model._meta.pk, AutoField):
                for idx, item in enumerate(model_data, 1):
                    item[model._meta.pk.attname] = idx
            model_data = list(filter(query.check_in_query, model_data))
            ordering = query.order_by
            if ordering:
                ordering = list(ordering)
                for idx, value in enumerate(ordering):
                    if value in ('pk', '-pk'):
                        ordering[idx] = value.replace('pk', model._meta.pk.name)
                model_data = multikeysort(
                    model_data,
                    ordering,
                    not query.standard_ordering
                )
            elif not query.standard_ordering:
                model_data.reverse()
            low = query.get('low_mark', 0)
            high = query.get('high_mark', len(model_data))
            model_data = model_data[low:high]

        fields = getattr(self, 'fields', None)
        if fields is None:
            handler = partial(
                self.construct_instance,
                model=model,
                only_fields=getattr(self, 'only_fields', None),
                defer_fields=getattr(self, 'defer_fields', None),
            )
        else:
            handler = partial(
                self.values_handler,
                fields=tuple(fields) or {f.name for f in model._meta.get_fields()},
                pk_name=model._meta.pk.name,
            )
        for data in model_data:
            yield handler(data)


class CustomQuerySet(BQuerySet):
    custom_iterable_class = CustomModelIterable
    custom_query_class = Query

    def _filter_or_exclude(self, negate, *args, **kwargs):
        clone = self._chain()
        if negate:
            filter_type = 'exclude'
        else:
            filter_type = 'filter'
        clone.query[filter_type] = clone.query.get(filter_type, {})
        clone.query[filter_type].update(kwargs)
        for q_arg in filter(lambda x: isinstance(x, dict), filter(bool, args)):
            clone.query[filter_type].update(q_arg)  # nocv
        return clone

    _filter_or_exclude_inplace = _filter_or_exclude

    def last(self):
        return self.reverse().first()

    def first(self):
        return next(iter(self), None)

    def values(self, *fields, **expressions):
        assert not expressions, 'Expressions is not supported on custom non-database models.'
        clone = self._clone()
        clone.__iterable_class__ = type('CustomModelIterableValues', (CustomModelIterable,), {'fields': fields})
        return clone

    def setup_custom_queryset_kwargs(self, **kwargs):
        qs = self._chain()
        qs.query['custom_queryset_kwargs'] = kwargs
        return qs

    def only(self, *fields):
        clone = self._clone()
        clone.__iterable_class__ = type('CustomModelIterable', (CustomModelIterable,), {'only_fields': fields})
        return clone

    def defer(self, *fields):
        clone = self._clone()
        clone.__iterable_class__ = type('CustomModelIterable', (CustomModelIterable,), {'defer_fields': fields})
        return clone


class CustomModelBase(ModelBaseClass):
    def __new__(mcs, name, bases, attrs, **kwargs):
        new_class = super(CustomModelBase, mcs).__new__(mcs, name, bases, attrs, **kwargs)
        if not new_class._meta.abstract:
            pk_name = new_class._meta.pk.attname
            new_class.add_to_class(
                pk_name,
                property(new_class.get_pk_value, new_class.set_pk_value)
            )
        return new_class


class ListModel(BaseModel, metaclass=CustomModelBase):
    """
    Custom model which uses a list of dicts with data (attribute `ListModel.data`) instead of database records.
    Useful when you have a simple list of data.

    Examples:
        .. sourcecode:: python

            from vstutils.custom_model import ListModel, CharField


            class Authors(ListModel):
                name = CharField(max_length=512)

                data = [
                    {"name": "Sergey Klyuykov"},
                    {"name": "Michael Taran"},
                ]

    Sometimes, it may be necessary to switch the data source. For these purposes,
    you should use the `setup_custom_queryset_kwargs` function, which takes various named arguments,
    which are also passed to the data initialization function.
    One such argument for :class:`ListModel` is date_source, which takes any iterable object.

    Examples:
        .. sourcecode:: python

            from vstutils.custom_model import ListModel, CharField


            class Authors(ListModel):
                name = CharField(max_length=512)

            qs = Authors.objects.setup_custom_queryset_kwargs(data_source=[
                {"name": "Sergey Klyuykov"},
                {"name": "Michael Taran"},
            ])

    In this case, we setup source list via `setup_custom_queryset_kwargs` function, and any other chained call
    is going to work with this data.

    :ivar list data: List with data dicts. Empty by default.
    """

    data = []
    objects = CustomQuerySet.as_manager()

    class Meta:
        abstract = True

    def get_pk_value(self):
        return getattr(
            self,
            f'_{self.__class__._meta.pk.attname}',
            None
        )

    def set_pk_value(self, value):
        setattr(
            self,
            f'_{self.__class__._meta.pk.attname}',
            value
        )

    @classmethod
    def _get_data(cls, chunked_fetch=False, data_source=None):
        # pylint: disable=unused-argument
        return deepcopy(cls.data if data_source is None else data_source)


class FileModel(ListModel):
    """
    Custom model that loads data from a YAML file instead of a database.
    The path to the file is specified in the `FileModel.file_path` attribute.

    Examples:
        Suppose the source file is stored at `/etc/authors.yaml` with the following content:

        .. sourcecode:: YAML

            - name: "Sergey Klyuykov"
            - name: "Michael Taran"

        You can create a custom model using this file:

        .. sourcecode:: python

            from vstutils.custom_model import FileModel, CharField

            class Authors(FileModel):
                name = CharField(max_length=512)

                file_path = '/etc/authors.yaml'

    """

    class Meta:
        abstract = True

    @classmethod
    def load_file_data(cls):
        # pylint: disable=no-member
        return get_file_value(cls.file_path, strip=False)

    @classmethod
    def _get_data(cls, chunked_fetch=False):
        return load(cls.load_file_data(), Loader=Loader)


class ExternalCustomModel(ListModel):
    """
    Represents a custom model designed for the self-implementation of requests to external services.

    This model facilitates the seamless interaction with external services by allowing the
    passing of filtering, limiting, and sorting parameters to an external request. It is designed
    to receive data that is already filtered and limited.

    To utilize this model effectively, developers need to implement the ``get_data_generator()``
    class method. This method receives a query object containing the necessary parameters,
    enabling developers to customize interactions with external services.

    **Example:**

    .. code-block:: python

        class MyExternalModel(ExternalCustomModel):
            # ... model fields ...

            class Meta:
                managed = False

            @classmethod
            def get_data_generator(cls, query):
                data = ... # some fetched data from the external resource or generated from memory calculations.
                for row in data:
                    yield row

    """
    class Meta:
        abstract = True

    @classmethod
    def get_data_generator(cls, query):
        """
        This class method must be implemented by derived classes to define custom logic
        for fetching data from an external service based on the provided query parameters.

        Query object might contain the following parameters:

        * filter (dict): A dictionary specifying the filtering criteria.
        * exclude (dict): A dictionary specifying the exclusion criteria.
        * order_by (list): A list specifying the sorting order.
        * low_mark (int): The low index for slicing (if sliced).
        * high_mark (int): The high index for slicing (if sliced).
        * is_sliced (bool): A boolean indicating whether the query is sliced.

        :param query: An object containing filtering, limiting, and sorting parameters.
        :type query: dict

        :return: A generator that yields the requested data.
        :rtype: Generator

        :raises NotImplementedError: If the method is not implemented by the derived class.
        """
        raise NotImplementedError


class ViewCustomModel(ExternalCustomModel):
    """
    Implements the SQL View programming mechanism over other models.

    This model provides a mechanism for implementing SQL View-like behavior over other models.
    In the ``get_view_queryset()`` method, a base query is prepared, and all further actions
    are implemented on top of it.

    **Example Usage:**

    .. code-block:: python

        class MyViewModel(ViewCustomModel):
            # ... model fields ...

            class Meta:
                managed = False

            @classmethod
            def get_view_queryset(cls):
                return SomeModel.objects.annotate(...)  # add some additional annotations to query
    """

    class Meta:
        abstract = True

    @classmethod
    def get_view_queryset(cls):
        """
        This class method must be implemented by derived classes to define custom logic
        for generating the base queryset for the SQL View.

        :return: The base queryset for the SQL View.
        :rtype: django.db.models.query.QuerySet

        :raises NotImplementedError: If the method is not implemented by the derived class.
        """
        raise NotImplementedError

    @classmethod
    def get_data_generator(cls, query):
        qs = cls.get_view_queryset()\
            .filter(**query.get('filter', {}))\
            .exclude(**query.get('exclude', {}))\
            .order_by(*query.order_by)
        if query.is_sliced:
            qs = qs[query.get('low_mark'):query.get('high_mark')]
        return qs.values(*{f.name for f in cls._meta.get_fields()})

    @classmethod
    def get_data_generator_count(cls, query):
        return cls.get_data_generator(query).count()
