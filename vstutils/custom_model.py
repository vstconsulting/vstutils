# from libc.stdlib cimport malloc
# cimport libc.stdlib as stdlib
from operator import itemgetter
from functools import cmp_to_key
from copy import deepcopy
import six
from yaml import load
try:
    from yaml import CLoader as Loader
except ImportError:  # nocv
    from yaml import Loader
from django.db.models.query import ModelIterable
from .models import BQuerySet, BaseModel

if six.PY3:  # nocv
    def cmp(a, b):
        return (a > b) - (a < b)


def prep_compare(column):
    if column.startswith('-'):
        return (itemgetter(column[1:].strip()), -1)
    else:
        return (itemgetter(column.strip()), 1)


def multikeysort(items, columns, reverse=False):
    comparers = map(prep_compare, columns)

    def comparer(left, right):
        comparer_iter = (
            cmp(fn(left), fn(right)) * mult
            for fn, mult in comparers
        )
        return next((result for result in comparer_iter if result), 0)

    return sorted(list(items), key=cmp_to_key(comparer), reverse=reverse)


class Query(dict):
    distinct_fields = False

    def __init__(self, queryset, *args, **kwargs):
        super(Query, self).__init__(*args, **kwargs)
        self.queryset = queryset
        self.standard_ordering = True

    def clone(self):
        return deepcopy(self)

    def _check_data(self, check_type, data):
        if getattr(self, 'empty', False):
            return False
        check_data = self.get(check_type, {})
        if check_type == 'exclude' and not check_data:
            return False
        for filter_name, filter_data in check_data.items():
            try:
                value = data[filter_name.replace('__in', '')]
            except KeyError:
                continue
            if '__in' in filter_name and value not in filter_data:
                return False
            elif '__in' not in filter_name and value != filter_data:
                return False
        return True

    def check_in_query(self, data):
        return self._check_data('filter', data) and not self._check_data('exclude', data)

    def set_empty(self):
        self.empty = True

    def set_limits(self, low=None, high=None):
        self['low_mark'], self['high_mark'] = low, high

    def has_results(self, *args, **kwargs):
        return bool(self.queryset.all()[:2])

    def get_count(self, using):
        return len(self.queryset.all())

    def can_filter(self):
        return self.get('low_mark', None) is None and self.get('high_mark', None) is None

    def clear_ordering(self, *args, **kwargs):
        self['ordering'] = []

    def add_ordering(self, *ordering):
        self['ordering'] = ordering


class CustomModelIterable(ModelIterable):
    def __iter__(self):
        queryset = self.queryset
        model = queryset.model
        model_data = model._get_data(chunked_fetch=self.chunked_fetch)
        model_data = filter(queryset.query.check_in_query, model_data)
        ordering = queryset.query.get('ordering', [])
        if ordering:
            # model_data = multikeysort(model_data, ordering, not queryset.query.standard_ordering)
            model_data = multikeysort(model_data, ordering)
            model_data.reverse()
        elif not queryset.query.standard_ordering:
            model_data.reverse()
        low = queryset.query.get('low_mark', 0)
        high = queryset.query.get('high_mark', len(model_data))
        for data in model_data[low:high]:
            yield model(**data)


class CustomQuerySet(BQuerySet):
    def __init__(self, model=None, query=None, using=None, hints=None):
        super(CustomQuerySet, self).__init__(model=model, query=None, using=using, hints=hints)
        self.query = query or Query(self)
        self._iterable_class = CustomModelIterable

    def _filter_or_exclude(self, is_exclude, *args, **kwargs):
        clone = self._clone()
        if is_exclude:
            filter_type = 'exclude'
        else:
            filter_type = 'filter'
        clone.query[filter_type] = clone.query.get(filter_type, {})
        clone.query[filter_type].update(kwargs)
        return clone

    def last(self):
        data = list(self)[-1:]
        if data:
            return data[0]

    def first(self):
        data = list(self[:1])
        if data:
            return data[0]


class ListModel(BaseModel):
    data = []
    objects = CustomQuerySet.as_manager()

    class Meta:
        abstract = True

    @classmethod
    def _get_data(cls, chunked_fetch=False):
        return deepcopy(cls.data)


class FileModel(ListModel):

    class Meta:
        abstract = True

    @classmethod
    def _get_data(cls, chunked_fetch=False):
        with open(cls.file_path, 'r') as fp:
            return load(fp.read(), Loader=Loader)
