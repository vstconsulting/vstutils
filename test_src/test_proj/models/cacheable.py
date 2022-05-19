from django.db.models import CharField
from vstutils.api.responses import HTTP_200_OK
from vstutils.models import BaseModel
from vstutils.models.decorators import register_view_action


class SomeViewMixin:
    def should_cache(self):
        return self.action != 'non_cached'


class CachableModel(BaseModel):
    _cache_responses = True
    name = CharField(max_length=128)

    class Meta:
        _list_fields = ['name']
        _view_class = 'read_only'

    @register_view_action(detail=False, inherit=True)
    def empty_action(self, request, *args, **kwargs):
        return HTTP_200_OK('OK')  # nocv


class CachableProxyModel(CachableModel):
    class Meta(CachableModel.OriginalMeta):
        proxy = True
        _view_class = (SomeViewMixin, 'read_only')

    @register_view_action(methods=['get'], detail=False)
    def non_cached(self, request, *args, **kwargs):
        return HTTP_200_OK('OK')
