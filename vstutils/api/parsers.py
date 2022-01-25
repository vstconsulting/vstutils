import functools
import operator

import ormsgpack
from rest_framework.exceptions import ParseError
from rest_framework.parsers import BaseParser
from rest_framework.settings import api_settings

from .renderers import MsgpackRenderer


class MsgpackParser(BaseParser):
    """
    Parses MessagePack-serialized data.
    """

    media_type = 'application/msgpack'
    renderer_class = MsgpackRenderer
    options = functools.reduce(
        operator.or_,
        api_settings.user_settings.get("MSGPACK_PARSER_OPTIONS", ()),
        None,
    )

    def parse(self, stream, media_type=None, parser_context=None):
        try:
            return ormsgpack.unpackb(stream.read(), option=self.options)
        except Exception as exc:  # nocv
            raise ParseError(f'Msgpack parse error - {exc}') from exc
