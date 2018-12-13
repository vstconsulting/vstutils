# pylint: disable=unused-import
from copy import deepcopy
from six import with_metaclass
from yaml import load
try:
    from yaml import CLoader as Loader
except ImportError:  # nocv
    from yaml import Loader
from django.db.models.query import ModelIterable
from django.db.models.fields import CharField, TextField, IntegerField, BooleanField
from .models import BQuerySet, BaseModel


def multikeysort(items, columns, reverse=False):
    items = list(items)
    columns = list(columns)
    columns.reverse()

    for column in columns:
        # pylint: disable=cell-var-from-loop
        is_reverse = column.startswith('-')
        if is_reverse:
            column = column[1:]
        items.sort(key=lambda row: row[column], reverse=is_reverse)

    if reverse:
        items.reverse()

    return items


class Query(dict):
    distinct_fields = False

    def __init__(self, queryset, *args, **kwargs):
        super(Query, self).__init__(*args, **kwargs)
        self.queryset = queryset
        self.model = self.queryset.model
        self.standard_ordering = True

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

    def set_limits(self, low=None, high=None):
        self['low_mark'], self['high_mark'] = low, high

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


class CustomModelIterable(ModelIterable):
    def __iter__(self):
        # pylint: disable=protected-access
        queryset = self.queryset
        model = queryset.model
        query = queryset.query
        model_data = model._get_data(chunked_fetch=self.chunked_fetch)
        model_data = list(filter(query.check_in_query, model_data))
        ordering = query.get('ordering', [])
        if ordering:
            model_data = multikeysort(model_data, ordering, not query.standard_ordering)
        elif not query.standard_ordering:
            model_data.reverse()
        low = query.get('low_mark', 0)
        high = query.get('high_mark', len(model_data))
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
        # pylint: disable=unused-argument
        return deepcopy(cls.data)


class FileModel(ListModel):

    class Meta:
        abstract = True

    @classmethod
    def load_file_data(cls):
        # pylint: disable=no-member
        with open(cls.file_path, 'r') as fp:
            return fp.read()

    @classmethod
    def _get_data(cls, chunked_fetch=False):
        return load(cls.load_file_data(), Loader=Loader)
