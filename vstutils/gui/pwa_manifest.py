import json
from django.conf import settings


class PWAManifest(object):
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

    def __init__(self, override_defaults=None):
        self.manifest_data = self.default_pwa_manifest.copy()
        self.manifest_data.update(override_defaults or {})

    @property
    def data(self):
        return self.manifest_data

    @property
    def json(self):
        return json.dumps(self.data, indent=4, skipkeys=True)
