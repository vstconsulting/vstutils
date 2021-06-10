from django.db.models import CharField
from vstutils.models import BModel


class CachableModel(BModel):
    _cache_responses = True
    name = CharField(max_length=128)

    class Meta:
        _list_fields = ['name']
        _view_class = 'read_only'
