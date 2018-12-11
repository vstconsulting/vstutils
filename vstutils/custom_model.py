# from libc.stdlib cimport malloc
# cimport libc.stdlib as stdlib
from copy import deepcopy
from operator import itemgetter
from functools import cmp_to_key

from yaml import load
try:
    from yaml import CLoader as Loader
except ImportError:  # nocv
    from yaml import Loader
from django.db.models.query import ModelIterable
from .models import BQuerySet, BaseModel

def cmp(a, b):
    return (a > b) - (a < b)

def prep_compare(column):
    if column.startswith('-'):
        return (itemgetter(column[1:].strip()), -1)
    else:
        return (itemgetter(column.strip()), 1)

def multikeysort(items, columns):
    comparers = map(prep_compare, columns)
    def comparer(left, right):
        comparer_iter = (
            cmp(fn(left), fn(right)) * mult
            for fn, mult in comparers
        )
        return next((result for result in comparer_iter if result), 0)
    return sorted(items, key=cmp_to_key(comparer))


class Query(dict):
    def clone(self):
        return deepcopy(self)

    def _check_data(self, check_type, data):
        for filter_name, filter_data in self.get(check_type, {}).items():
            try:
                value = data[filter_name.replace('__in', '')]
            except KeyError:
                continue
            if '__in' in filter_name and value not in filter_data:
                return False
            elif '__in' not in filter_name and value != filter_data:
                return False
        return True

    def check_in_query(self, **data):
        return self._check_data('filter', data) and not self._check_data('exclude', data)


class CustomModelIterable(ModelIterable):
    def __iter__(self):
        queryset = self.queryset
        model = queryset.model
        model_data = model._get_data(chunked_fetch=self.chunked_fetch)
        index = 0
        for data in model_data:
            if not queryset.query.check_in_query(**data):
                del model_data[index]
            index += 1
        # multikeysort(model_data, queryset.query.get('ordering', None))
            yield model(**data)


class CustomQuerySet(BQuerySet):
    def __init__(self, model=None, query=None, using=None, hints=None):
        super(CustomQuerySet, self).__init__(model=model, query=None, using=using, hints=hints)
        self.query = query or Query()
        self._iterable_class = CustomModelIterable

    def filter(self, *args, **kwargs):
        return self.filter_exclude_options(True, *args, **kwargs)

    def exclude(self, *args, **kwargs):
        return self.filter_exclude_options(False, *args, **kwargs)

    def filter_exclude_options(self, is_filter, *args, **kwargs):
        clone = self._clone()
        if is_filter:
            clone.query['filter'] = clone.query.get('filter', {})
            clone.query['filter'].update(kwargs)
        else:
            clone.query['exclude'] = clone.query.get('exclude', {})
            clone.query['exclude'].update(kwargs)
        return clone

    def none(self):
        clone = self.__class__(query=None)
        return clone

    def all(self):
        return self._clone()

    def order_by(self, *field_names):
        clone = self._clone()
        clone.query['ordering'] = field_names
        return clone

    def reverse(self):
        clone = self._clone()
        clone.query['standart_ordering'] = not clone.query.get('standart_ordering', True)
        return clone

    def count(self):
        self._fetch_all()
        return len(self._result_cache)


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
