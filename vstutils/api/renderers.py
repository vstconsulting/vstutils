import functools
import operator

import ormsgpack
from django.utils.functional import Promise, LazyObject
from rest_framework.renderers import BaseRenderer
from rest_framework.settings import api_settings
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


class MsgpackRenderer(BaseRenderer):
    """
    Renderer which serializes to MessagePack.
    """

    media_type = 'application/msgpack'
    format = 'msgpack'
    render_style = 'binary'
    charset = None
    options = functools.reduce(
        operator.or_,
        api_settings.user_settings.get("MSGPACK_RENDERER_OPTIONS", ()),
        ormsgpack.OPT_SERIALIZE_NUMPY,
    )

    def render(self, data, accepted_media_type=None, renderer_context=None):
        """
        Renders *obj* into serialized MessagePack.
        """
        if data is None:
            return ''  # nocv
        return ormsgpack.packb(data, default=ORJSONRenderer.default, option=self.options)
