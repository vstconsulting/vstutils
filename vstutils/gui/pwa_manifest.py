import typing

import orjson
from django.conf import settings


class PWAManifest:
    __slots__ = ('manifest_data',)
    default_pwa_manifest = {
        "name": settings.PROJECT_GUI_NAME.capitalize(),
        "short_name": settings.VST_PROJECT.capitalize(),
        "theme_color": "rgb(236,240,245)",
        "background_color": "rgb(236,240,245)",
        "display": "standalone",
        "scope": ".",
        "start_url": "./",
        "icons": []
    }
    default_pwa_manifest.update(getattr(settings, 'PWA_MANIFEST', {}))

    def __init__(self, override_defaults: typing.Dict = None):
        self.manifest_data = self.default_pwa_manifest.copy()
        self.manifest_data.update(override_defaults or {})

    @property
    def icons(self):
        return tuple(self.manifest_data.get("icons", []))

    @property
    def data(self) -> typing.Dict:
        return self.manifest_data

    @property
    def json(self) -> typing.Text:
        return orjson.dumps(self.data, option=orjson.OPT_INDENT_2).decode('utf-8')
