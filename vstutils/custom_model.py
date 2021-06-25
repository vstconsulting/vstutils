# pylint: disable=unused-import
from copy import deepcopy
from functools import partial

from yaml import load
try:
    from yaml import CSafeLoader as Loader
except ImportError:  # nocv
    from yaml import SafeLoader as Loader
from django.db.models.query import ModelIterable
from django.db.models.fields import CharField, TextField, IntegerField, BooleanField    # noqa: F401

from .models import BQuerySet, BaseModel
from .tools import get_file_value, multikeysort  # pylint: disable=import-error


class Query(dict):
    __slots__ = 'queryset', 'combinator', 'is_sliced', 'select_for_update', 'select_related', 'empty'
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

    def chain(self):  # nocv
        return self.clone()

    def clone(self):
        return deepcopy(self)

    def _check_data(self, check_type, data):
        # pylint: disable=protected-access
        if getattr(self, 'empty', False):
            return False
        check_data = self.get(check_type, {})
        if check_type == 'exclude' and not check_data:
            return False
        meta = self.model._meta
        for filter_name, filter_data in check_data.items():
            filter_name = filter_name.replace('__exact', '')
            filter_name__cleared = filter_name.split('__')[0]
            if filter_name__cleared == 'pk':
                filter_name = '__'.join(
                    [meta.pk.attname] + filter_name.split('__')[1:]
                )
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
            if '__in' in filter_name and value not in filter_data:
                return False
            elif '__in' not in filter_name and value != filter_data:
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
    __slots__ = ()

    def values_handler(self, unit):
        # pylint: disable=no-member
        return {f: unit.get(f) for f in self.fields}  # nocv

    def construct_instance(self, data, model):
        return model(**data)

    def __iter__(self):
        # pylint: disable=protected-access
        queryset = self.queryset
        model = queryset.model
        query = queryset.query
        model_data = model._get_data(chunked_fetch=self.chunked_fetch)
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
        fields = getattr(self, 'fields', None)
        handler = partial(self.construct_instance, model=model) if not fields else self.values_handler
        for data in model_data[low:high]:
            yield handler(data)


class CustomQuerySet(BQuerySet):
    __slots__ = ()
    custom_iterable_class = CustomModelIterable
    custom_query_class = Query

    def _filter_or_exclude(self, negate, *args, **kwargs):
        clone = self._clone()
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
        data = list(self)[-1:]
        if data:
            return data[0]

    def first(self):
        data = list(self[:1])
        if data:
            return data[0]

    def values(self, *fields, **expressions):
        assert not expressions, 'Expressions is not supported on custom non-database models.'
        clone = self._clone()
        clone.__iterable_class__ = type('CustomModelIterableValues', (object,), {'fields': fields})
        return clone


class ListModel(BaseModel):
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
    """

    #: List with data dicts. Empty by default.
    data = []
    objects = CustomQuerySet.as_manager()

    class Meta:
        abstract = True

    @classmethod
    def _get_data(cls, chunked_fetch=False):
        # pylint: disable=unused-argument
        return deepcopy(cls.data)


class FileModel(ListModel):
    """
    Custom model which loads data from YAML-file instead of database.
    Path to the file stored in `FileModel.file_path` attribute.


    Examples:
        Source file stored in `/etc/authors.yaml` with content:

        .. sourcecode:: YAML

            - name: "Sergey Klyuykov"
            - name: "Michael Taran"

        Example:

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
