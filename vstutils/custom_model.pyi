import typing as _t
from pathlib import Path
from django.db.models.query import ModelIterable
from django.db.models.fields import CharField as cf, TextField as tf, IntegerField as intf, BooleanField as bf
from .models.queryset import BQuerySet
from .models.model import BaseModel


class CharField(cf):
    ...


class TextField(tf):
    ...


class IntegerField(intf):
    ...


class BooleanField(bf):
    ...


class CustomQuerySet(BQuerySet):
    def _filter_or_exclude(self, is_exclude, *args, **kwargs) -> BQuerySet:
        ...

    def last(self) -> _t.Union[BaseModel, _t.NoReturn]:
        ...

    def first(self) -> _t.Union[BaseModel, _t.NoReturn]:
        ...


class CustomModelIterable(ModelIterable):
    def values_handler(self, unit: _t.Dict) -> _t.Dict:
        ...

    def construct_instance(self, data: _t.Dict, model: _t.Type[BaseModel]) -> BaseModel:
        ...

    def __iter__(self) -> _t.Iterator[BaseModel]:
        ...


class ListModel(BaseModel):
    data: _t.ClassVar[_t.List[_t.Dict]]

    def _get_data(self, chunked_fetch: bool = False, data_source: _t.Iterable = None) -> _t.List[_t.Dict]:
        ...


class FileModel(ListModel):
    file_path: _t.ClassVar[_t.Union[_t.Text, Path]]

    @classmethod
    def load_file_data(cls) -> _t.Text:
        ...


class Query(_t.Dict):
    distinct_fields: _t.ClassVar[bool]
    queryset: CustomQuerySet
    standard_ordering: _t.Union[bool, property]
    model: _t.Union[ListModel, property]

    def __init__(self, queryset: CustomQuerySet, *args, **kwargs):
        ...

    def chain(self):
        ...

    def clone(self) -> Query:
        ...

    def _check_data(self, check_type: _t.Text, data: _t.Dict):
        ...

    def check_in_query(self, data: _t.Dict):
        ...

    def set_empty(self) -> _t.NoReturn:
        ...

    def set_limits(self, low: int = None, high: int = None):
        ...

    def has_results(self, *args, **kwargs) -> bool:
        ...

    def get_count(self, using) -> int:
        ...

    def can_filter(self) -> bool:
        ...

    def clear_ordering(self, *args, **kwargs) -> _t.NoReturn:
        ...

    def add_ordering(self, *ordering) -> _t.NoReturn:
        ...
