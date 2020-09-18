import codecs
import ujson
from django.conf import settings
from rest_framework.parsers import JSONParser as drfJSONParser
from rest_framework.exceptions import ParseError

from .renderers import JSONRenderer


class JSONParser(drfJSONParser):
    renderer_class = JSONRenderer

    def parse(self, stream, media_type=None, parser_context=None):
        """
        Parses the incoming bytestream as JSON and returns the resulting data.
        """
        parser_context = parser_context or {}
        encoding = parser_context.get('encoding', settings.DEFAULT_CHARSET)

        try:
            return ujson.load(codecs.getreader(encoding)(stream))
        except ValueError as exc:  # nocv
            raise ParseError('JSON parse error - %s' % str(exc))
