from drf_yasg import renderers, codecs

from ..renderers import ORJSONRenderer


class OpenAPICodecJson(codecs.OpenAPICodecJson):
    renderer = ORJSONRenderer()

    def _dump_dict(self, spec):
        return self.renderer.render(spec, media_type=self.media_type) if not self.pretty else super()._dump_dict(spec)


class OpenAPIRenderer(renderers.OpenAPIRenderer):
    codec_class = OpenAPICodecJson


class SwaggerJSONRenderer(renderers.SwaggerJSONRenderer):
    codec_class = OpenAPICodecJson
