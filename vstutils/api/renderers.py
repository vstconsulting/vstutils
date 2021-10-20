from django.utils.functional import Promise, LazyObject
from drf_orjson_renderer.renderers import ORJSONRenderer as BaseORJSONRenderer  # type: ignore

from ..utils import get_if_lazy


class ORJSONRenderer(BaseORJSONRenderer):
    @staticmethod
    def default(obj):
        # pylint: disable=protected-access
        if isinstance(obj, Promise):
            obj = obj._proxy____cast()
        elif isinstance(obj, LazyObject):
            obj = get_if_lazy(obj)
        return BaseORJSONRenderer.default(obj)
