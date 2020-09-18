import ujson
from rest_framework.renderers import JSONRenderer as drfJSONRenderer


class JSONRenderer(drfJSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        """
        Render `data` into JSON, returning a bytestring.
        """
        if data is None:
            return b''

        ret = ujson.dumps(
            data,
            indent=self.get_indent(accepted_media_type, renderer_context or {}),
            ensure_ascii=self.ensure_ascii,
            allow_nan=not self.strict
        )

        # We always fully escape \u2028 and \u2029 to ensure we output JSON
        # that is a strict javascript subset.
        # See: http://timelessrepo.com/json-isnt-a-javascript-subset
        return ret.replace('\u2028', '\\u2028').replace('\u2029', '\\u2029').encode()
